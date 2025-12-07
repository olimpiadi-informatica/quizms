import crypto from "node:crypto";

import type { Contest, Participation, Student } from "@olinfo/quizms/models";
import { randomToken } from "@olinfo/quizms/utils";
import { TRPCError } from "@trpc/server";
import { addMinutes, addSeconds, isFuture, isPast, roundToNearestMinutes } from "date-fns";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFunctions } from "firebase-admin/functions";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { chunk } from "lodash-es";
import z from "zod";

import { auth, db } from "../common";
import {
  getContest,
  getParticipation,
  getParticipationByToken,
  getParticipationStudents,
  getUser,
} from "./queries";
import { publicProcedure } from "./trpc";

const region = defineString("QUIZMS_REGION");

export const teacherLogin = publicProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data } = opts;
    logger.info("Teacher login request received", { data });

    const user = await getUser(data.username);
    if (!user) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Username non esistente" });
    }

    if (user.password !== data.password) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Password non corretta" });
    }
    if (user.role !== "teacher") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Utenza non abilitata" });
    }

    return auth.createCustomToken(crypto.randomUUID(), {
      role: "teacher",
      schoolId: user.id,
    });
  });

async function checkParticipation(
  participationId: string,
  claims: DecodedIdToken | undefined,
  onlineOnly: boolean,
): Promise<[Participation, Contest]> {
  const participation = await getParticipation(participationId);
  if (!participation) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gara non valida" });
  }

  if (participation.schoolId !== claims?.schoolId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gara non valida" });
  }

  const contest = await getContest(participation.contestId);
  if (onlineOnly) {
    if (!contest.hasOnline) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non abilitata per prove online" });
    }
    if (isFuture(contest.contestWindowStart)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }
    if (isPast(contest.contestWindowEnd)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già terminata" });
    }
  }

  return [participation, contest];
}

async function generateToken() {
  for (;;) {
    const token = await randomToken();
    if (!(await getParticipationByToken(token))) {
      return token;
    }
  }
}

export const teacherStartParticipation = publicProcedure
  .input(z.object({ participationId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher start participation received", { data });

    const [participation, contest] = await checkParticipation(
      data.participationId,
      ctx.claims,
      true,
    );

    if (
      participation.endingTime != null &&
      contest.hasOnline &&
      (isFuture(participation.endingTime) || !contest.allowRestart)
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
    }

    if (participation.token) {
      const students = await getParticipationStudents(participation.id, participation.token);
      await revokeTokens(students);
    }

    const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
    const endingTime = addMinutes(startingTime, contest.hasOnline ? contest.duration : 0);

    const token = await generateToken();

    await db.doc(`participations/${participation.id}`).update({
      token,
      startingTime,
      endingTime,
    });

    try {
      const taskQueue = getFunctions().taskQueue(
        `locations/${region.value()}/functions/updateScores`,
      );
      await taskQueue.enqueue(
        { participationId: participation.id, token },
        { scheduleTime: addSeconds(endingTime, 5) },
      );
    } catch (error) {
      logger.error("Failed to queue updateScores task", { error });
    }
  });

export const teacherStopParticipation = publicProcedure
  .input(z.object({ participationId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher stop participation received", { data });

    const [participation] = await checkParticipation(data.participationId, ctx.claims, true);

    if (participation.startingTime == null) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    if (isPast(participation.startingTime)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
    }

    const students = await getParticipationStudents(participation.id, participation.token!);
    await revokeTokens(students);

    for (const studentChunk of chunk(students, 300)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        batch.delete(db.doc(`participations/${participation.id}/students/${student.id}`));
      }
      await batch.commit();
    }

    await db.doc(`participations/${participation.id}`).update({
      token: null,
      startingTime: null,
      endingTime: null,
    });
  });

async function revokeTokens(students: Student[]) {
  await Promise.all(
    students.map(async (student) => {
      if (student.uid) {
        await auth.revokeRefreshTokens(student.uid).catch(() => {});
      }
    }),
  );
}

export const teacherFinalizeParticipation = publicProcedure
  .input(z.object({ participationId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher finalize participation received", { data });

    const [participation] = await checkParticipation(data.participationId, ctx.claims, false);

    await db.doc(`participations/${participation.id}`).update({ finalized: true });
  });
