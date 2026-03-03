import crypto from "node:crypto";

import type { Contest, Student, Venue } from "@olinfo/quizms/models";
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
import { getContest, getUser, getVenue, getVenueByToken, getVenueStudents } from "./queries";
import { publicProcedure } from "./trpc";

const region = defineString("QUIZMS_REGION");

export const teacherLogin = publicProcedure
  .input(
    z.strictObject({
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

async function checkVenue(
  venueId: string,
  claims: DecodedIdToken | undefined,
  onlineOnly: boolean,
): Promise<[Venue, Contest]> {
  const venue = await getVenue(venueId);
  if (!venue) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gara non valida" });
  }

  if (venue.schoolId !== claims?.schoolId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gara non valida" });
  }

  const contest = await getContest(venue.contestId);
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

  return [venue, contest];
}

async function generateToken() {
  for (;;) {
    const token = await randomToken();
    if (!(await getVenueByToken(token))) {
      return token;
    }
  }
}

export const teacherStartContestWindow = publicProcedure
  .input(z.strictObject({ venueId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher start venue received", { data });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims, true);

    if (
      venue.contestWindow &&
      contest.hasOnline &&
      (isFuture(venue.contestWindow.end) || !contest.allowRestart)
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
    }

    if (venue.token) {
      const students = await getVenueStudents(venue.id, venue.token);
      await revokeTokens(students);
    }

    const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
    const endingTime = addMinutes(startingTime, contest.hasOnline ? contest.duration : 0);

    const token = await generateToken();

    await db.doc(`venues/${venue.id}`).update({
      token,
      contestRange: {
        start: startingTime,
        end: endingTime,
      },
    });

    try {
      const taskQueue = getFunctions().taskQueue(
        `locations/${region.value()}/functions/updateScores`,
      );
      await taskQueue.enqueue(
        { venueId: venue.id, token },
        { scheduleTime: addSeconds(endingTime, 5) },
      );
    } catch (error) {
      logger.error("Failed to queue updateScores task", { error });
    }
  });

export const teacherStopContestWindow = publicProcedure
  .input(z.strictObject({ venueId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher stop venue received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims, true);

    if (venue.contestWindow == null) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    if (isPast(venue.contestWindow.start)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
    }

    const students = await getVenueStudents(venue.id, venue.token!);
    await revokeTokens(students);

    for (const studentChunk of chunk(students, 300)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        batch.delete(db.doc(`venues/${venue.id}/students/${student.id}`));
      }
      await batch.commit();
    }

    await db.doc(`venues/${venue.id}`).update({
      token: null,
      contestRange: null,
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

export const teacherFinalizeVenue = publicProcedure
  .input(z.strictObject({ venueId: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher finalize venue received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims, false);

    await db.doc(`venues/${venue.id}`).update({ finalized: true });
  });
