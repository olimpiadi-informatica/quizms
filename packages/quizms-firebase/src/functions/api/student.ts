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
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { studentConverter } from "~/cli/utils/converters-admin";

import { auth, db } from "../common";
import { apiError } from "./errors";
import {
  getContest,
  getRandomVariant,
  getStudent,
  getStudentByHash,
  getVariant,
  getVenue,
  getVenueByToken,
} from "./queries";
import { docId } from "./schemas";
import { publicProcedure, studentProcedure } from "./trpc";

export function studentHash(contest: Contest, userData: NonNullable<Student["userData"]>) {
  return hash("sha256", getNormalizedUserData(contest, { userData }));
}

export const studentLogin = publicProcedure
  .input(
    z.strictObject({
      contestId: docId,
      token: z.string(),
      userData: studentSchema.shape.userData.unwrap().required(),
      extraData: studentSchema.shape.extraData.unwrap(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data } = opts;
    logger.info("Student login request received", { contestId: data.contestId });

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

    const newStudent = await db.collection(`venues/${venue.id}/students`).add({
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
      studentId: newStudent.id,
      venueId: venue.id,
      variantId: variant.id,
    });
  });

type StudentClaims = DecodedIdToken & { studentId: string; venueId: string };

function studentRef(claims: StudentClaims) {
  return db
    .doc(`venues/${claims.venueId}/students/${claims.studentId}`)
    .withConverter(studentConverter);
}

async function checkStudent(claims: StudentClaims, ongoing: boolean): Promise<Student> {
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

export const studentSetLanguage = studentProcedure
  .input(z.strictObject({ language: z.string() }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Student set language received", { data, uid: ctx.claims.uid });

    const student = await checkStudent(ctx.claims, false);

    // Contests stored before `languages` existed have only the default language.
    const contest = await getContest(student.contestId!);
    if (!(contest.languages ?? ["it"]).includes(data.language)) {
      throw apiError("BAD_REQUEST", "invalidLanguage");
    }

    // The language can change at any time, also before the start and after the end of the
    // contest: it doesn't affect the answers or the score.
    await studentRef(ctx.claims).update({
      language: data.language,
      updatedAt: Timestamp.now(),
    });
  });

export const studentSetAnswer = studentProcedure
  .input(
    z.strictObject({
      problemId: z.string().min(1),
      answer: answerSchema,
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    const student = await checkStudent(ctx.claims, true);

    // Validate the problem against the student's variant: this rejects unknown ids and answers
    // of the wrong type, which would otherwise be stored and silently ignored by the scoring.
    const variant = student.variantId ? await getVariant(student.variantId) : undefined;
    const problem = variant?.schema[data.problemId];
    if (!problem) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Domanda non valida" });
    }
    if (problem.type !== data.answer.type) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo di risposta non valido" });
    }

    const answer = { ...data.answer };
    if (answer.value === undefined) {
      delete answer.value;
    }

    // Problem ids of sub-problems contain a dot (e.g. "3.1"): an explicit `FieldPath` keeps the id
    // as a single key, while a dotted string would be split into nested fields.
    await studentRef(ctx.claims).update(
      new FieldPath("answers", data.problemId),
      answer,
      "updatedAt",
      Timestamp.now(),
    );
  });

export const studentSubmitContest = studentProcedure.mutation(async (opts) => {
  const { ctx } = opts;
  await checkStudent(ctx.claims, true);
  const ref = studentRef(ctx.claims);

  await db.runTransaction(async (t) => {
    const student = (await t.get(ref)).data();
    if (!student?.participationWindow) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    // Never extend the window: submitting during the grace period keeps the original end.
    const now = new Date();
    const currentEnd = student.participationWindow.end;
    const newEnd = currentEnd < now ? currentEnd : now;

    t.update(ref, {
      "participationWindow.end": Timestamp.fromDate(newEnd),
      updatedAt: Timestamp.now(),
    });
  });
});
