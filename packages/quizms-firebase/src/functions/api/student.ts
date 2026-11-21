import crypto, { hash } from "node:crypto";

import {
  answerSchema,
  type Contest,
  getNormalizedUserData,
  type Student,
  studentSchema,
} from "@olinfo/quizms/models";
import { TRPCError } from "@trpc/server";
import { addSeconds, isFuture, isPast } from "date-fns";
import type { DecodedIdToken } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { auth, db } from "../common";
import {
  getContest,
  getRandomVariant,
  getStudent,
  getStudentByHash,
  getVenue,
  getVenueByToken,
} from "./queries";
import { publicProcedure } from "./trpc";

export function studentHash(contest: Contest, userData: NonNullable<Student["userData"]>) {
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
      throw new TRPCError({ code: "BAD_REQUEST", message: "Codice prova non valido" });
    }
    if (venue.contestId !== data.contestId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Codice prova non valido" });
    }

    const contest = await getContest(venue.contestId);

    const uid = crypto.randomUUID();
    const userDataHash = studentHash(contest, data.userData);

    const duplicated = await getStudentByHash(venue.id, userDataHash);
    if (duplicated) {
      if (duplicated.token !== data.token) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Hai già partecipato a questa gara",
        });
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

async function checkStudent(claims: DecodedIdToken | undefined, ongoing = true): Promise<Student> {
  if (
    claims?.role !== "student" ||
    typeof claims.studentId !== "string" ||
    typeof claims.venueId !== "string"
  ) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
  }

  const student = await getStudent(claims.venueId, claims.studentId);
  if (!student) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Studente non trovato" });
  }

  if (student.uid !== claims.uid) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sessione non valida" });
  }

  if (student.disabled) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Utente disabilitato" });
  }

  if (ongoing) {
    if (!student.participationWindow) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    if (isFuture(student.participationWindow.start)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    if (isPast(addSeconds(student.participationWindow.end, 10))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già terminata" });
    }

    const venue = await getVenue(claims.venueId);
    if (!venue?.token || venue.token !== student.token) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non valida o terminata" });
    }
  }

  return student;
}

export const studentSetLanguage = publicProcedure
  .input(z.strictObject({ language: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Student set language received", { data, uid: ctx.claims?.uid });

    const claims = ctx.claims;
    const student = await checkStudent(claims, false);

    // Contests stored before `languages` existed have only the default language.
    const contest = await getContest(student.contestId!);
    if (!(contest.languages ?? ["it"]).includes(data.language)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Lingua non valida" });
    }

    // The language can change at any time, also before the start and after the end of the
    // contest: it doesn't affect the answers or the score.
    await db.doc(`venues/${claims!.venueId}/students/${claims!.studentId}`).update({
      language: data.language,
      updatedAt: Timestamp.now(),
    });
  });

export const studentSetAnswer = publicProcedure
  .input(
    z.strictObject({
      problemId: z.string(),
      answer: answerSchema,
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    const claims = ctx.claims;
    await checkStudent(claims, true);

    const answer = { ...data.answer };
    if (answer.value === undefined) {
      delete answer.value;
    }

    await db.doc(`venues/${claims!.venueId}/students/${claims!.studentId}`).update({
      [`answers.${data.problemId}`]: answer,
      updatedAt: Timestamp.now(),
    });
  });

export const studentSubmitContest = publicProcedure.mutation(async (opts) => {
  const { ctx } = opts;
  const claims = ctx.claims;
  const student = await checkStudent(claims, true);

  const now = new Date();
  const currentEnd = student.participationWindow!.end;
  const newEnd = currentEnd < now ? currentEnd : now;

  await db.doc(`venues/${claims!.venueId}/students/${claims!.studentId}`).update({
    "participationWindow.end": Timestamp.fromDate(newEnd),
    updatedAt: Timestamp.now(),
  });
});
