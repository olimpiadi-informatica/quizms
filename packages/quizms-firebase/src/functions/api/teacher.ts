import crypto from "node:crypto";

import type { Contest, Student, Venue } from "@olinfo/quizms/models";
import { randomToken } from "@olinfo/quizms/utils";
import { addMinutes, addSeconds, isFuture, isPast, roundToNearestMinutes } from "date-fns";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { chunk } from "lodash-es";
import z from "zod";

import { auth, db } from "../common";
import { apiError } from "./errors";
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
      throw apiError("BAD_REQUEST", "unknownUsername");
    }

    if (user.password !== data.password) {
      throw apiError("BAD_REQUEST", "wrongPassword");
    }
    if (user.role !== "teacher") {
      throw apiError("FORBIDDEN", "userDisabled");
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
    throw apiError("BAD_REQUEST", "invalidContest");
  }

  if (venue.schoolId !== claims?.schoolId) {
    throw apiError("FORBIDDEN", "invalidContest");
  }

  const contest = await getContest(venue.contestId);
  if (onlineOnly) {
    if (!contest.onlineSettings) {
      throw apiError("FORBIDDEN", "contestNotOnline");
    }
    if (isFuture(contest.onlineSettings.contestWindow.start)) {
      throw apiError("FORBIDDEN", "contestNotStarted");
    }
    if (isPast(contest.onlineSettings.contestWindow.end)) {
      throw apiError("FORBIDDEN", "contestEnded");
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
      venue.participationWindow &&
      contest.onlineSettings &&
      (isFuture(venue.participationWindow.end) || !contest.onlineSettings.allowRestart)
    ) {
      throw apiError("FORBIDDEN", "contestAlreadyStarted");
    }

    if (venue.token) {
      const students = await getVenueStudents(venue.id, venue.token);
      await revokeTokens(students);
    }

    const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
    const endingTime = addMinutes(startingTime, contest.onlineSettings?.duration ?? 0);

    const token = await generateToken();

    await db.doc(`venues/${venue.id}`).update({
      token,
      participationWindow: {
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

    const { participationWindow, token } = venue;
    if (!participationWindow || !token) {
      throw apiError("FORBIDDEN", "contestNotStarted");
    }

    if (isPast(participationWindow.start)) {
      throw apiError("FORBIDDEN", "contestAlreadyStarted");
    }

    const students = await getVenueStudents(venue.id, token);
    await revokeTokens(students);

    for (const studentChunk of chunk(students, 300)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        batch.delete(db.doc(`venues/${venue.id}/students/${student.id}`));
      }
      await batch.commit();
    }

    await db.doc(`venues/${venue.id}`).update({
      token: FieldValue.delete(),
      participationWindow: FieldValue.delete(),
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
