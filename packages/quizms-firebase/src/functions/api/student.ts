import crypto, { hash } from "node:crypto";

import {
  type Contest,
  getNormalizedUserData,
  type Student,
  studentSchema,
} from "@olinfo/quizms/models";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { auth, db } from "../common";
import { apiError } from "./errors";
import {
  getContest,
  getRandomVariant,
  getStudent,
  getStudentByHash,
  getVenueByToken,
} from "./queries";
import { publicProcedure } from "./trpc";

function studentHash(contest: Contest, userData: NonNullable<Student["userData"]>) {
  return hash("sha256", getNormalizedUserData(contest, { userData }));
}

export const studentLogin = publicProcedure
  .input(
    z.strictObject({
      contestId: z.string(),
      token: z.string(),
      userData: studentSchema.shape.userData.unwrap().required(),
      extraData: studentSchema.shape.extraData.unwrap(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data } = opts;
    logger.info("Student login request received", { data });

    const venue = await getVenueByToken(data.token);
    if (!venue) {
      throw apiError("BAD_REQUEST", "invalidToken");
    }
    if (venue.contestId !== data.contestId) {
      throw apiError("FORBIDDEN", "invalidToken");
    }

    const contest = await getContest(venue.contestId);

    const uid = crypto.randomUUID();
    const userDataHash = studentHash(contest, data.userData);

    const duplicated = await getStudentByHash(venue.id, userDataHash);
    if (duplicated) {
      if (duplicated.token !== data.token) {
        throw apiError("FORBIDDEN", "alreadyParticipated");
      }

      await db.doc(`studentRestores/${uid}`).set({
        studentId: duplicated.id,
        venueId: duplicated.venueId,
        token: data.token,
        name: data.userData.name,
        surname: data.userData.surname,
        approvalCode: Math.round(Math.random() * 1000),
        status: "pending",
        createdAt: Timestamp.now(),
      });

      return auth.createCustomToken(uid, {
        role: "student",
        studentId: duplicated.id,
        venueId: duplicated.venueId,
        variantId: duplicated.variantId,
      });
    }

    const variant = await getRandomVariant(data.contestId);

    const studentRef = await db.collection(`venues/${venue.id}/students`).add({
      uid,
      userData: data.userData,
      userDataHash,
      absent: false,
      disabled: false,
      venueId: venue.id,
      contestId: data.contestId,
      token: data.token,
      participationWindow: venue.participationWindow,
      variantId: variant.id,
      answers: {},
      extraData: data.extraData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return auth.createCustomToken(uid, {
      role: "student",
      studentId: studentRef.id,
      venueId: venue.id,
      variantId: variant.id,
    });
  });

export const studentSetLanguage = publicProcedure
  .input(z.strictObject({ language: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Student set language received", { data, uid: ctx.claims?.uid });

    const claims = ctx.claims;
    if (claims?.role !== "student" || !claims.venueId || !claims.studentId) {
      throw apiError("UNAUTHORIZED", "invalidLogin");
    }

    const student = await getStudent(claims.venueId, claims.studentId);
    // A disabled student was deleted by the teacher: logging in again creates a new student.
    if (!student || student.uid !== claims.uid || student.disabled) {
      throw apiError("FORBIDDEN", "invalidStudent");
    }

    // Contests stored before `languages` existed have only the default language.
    const contest = await getContest(student.contestId!);
    if (!(contest.languages ?? ["it"]).includes(data.language)) {
      throw apiError("BAD_REQUEST", "invalidLanguage");
    }

    // The language can change at any time, also before the start and after the end of the
    // contest: it doesn't affect the answers or the score.
    await db.doc(`venues/${claims.venueId}/students/${claims.studentId}`).update({
      language: data.language,
      updatedAt: Timestamp.now(),
    });
  });
