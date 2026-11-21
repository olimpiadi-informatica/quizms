import crypto from "node:crypto";

import {
  answerSchema,
  type Contest,
  calcScore,
  type Student,
  studentSchema,
  type Venue,
} from "@olinfo/quizms/models";
import { randomToken } from "@olinfo/quizms/utils";
import { TRPCError } from "@trpc/server";
import { addMinutes, addSeconds, isFuture, isPast, roundToNearestMinutes } from "date-fns";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { chunk } from "lodash-es";
import z from "zod";

import { studentConverter, studentRestoreConverter } from "~/cli/utils/converters-admin";

import { auth, db } from "../common";
import {
  getContest,
  getContestVariants,
  getStudent,
  getUser,
  getVenue,
  getVenueByToken,
  getVenueStudents,
} from "./queries";
import { studentHash } from "./student";
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
  if (claims?.role !== "teacher" || typeof claims.schoolId !== "string") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
  }

  const venue = await getVenue(venueId);
  if (!venue) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gara non valida" });
  }

  if (venue.schoolId !== claims.schoolId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gara non valida" });
  }

  const contest = await getContest(venue.contestId);
  if (onlineOnly) {
    if (!contest.onlineSettings) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non abilitata per prove online" });
    }
    if (isFuture(contest.onlineSettings.contestWindow.start)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }
    if (isPast(contest.onlineSettings.contestWindow.end)) {
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
      venue.participationWindow &&
      contest.onlineSettings &&
      (isFuture(venue.participationWindow.end) || !contest.onlineSettings.allowRestart)
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
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
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara non iniziata" });
    }

    if (isPast(participationWindow.start)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già iniziata" });
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

export const teacherApproveStudentRestore = publicProcedure
  .input(
    z.strictObject({
      venueId: z.string(),
      studentRestoreId: z.string(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher approve student restore received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims, false);

    const restoreDoc = await db
      .doc(`studentRestores/${data.studentRestoreId}`)
      .withConverter(studentRestoreConverter)
      .get();
    const restore = restoreDoc.data();
    if (!restore || restore.venueId !== venue.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Richiesta non trovata" });
    }

    if (restore.status !== "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Richiesta non più valida" });
    }

    const student = await getStudent(venue.id, restore.studentId);
    if (!student) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Studente non trovato" });
    }

    if (student.uid) {
      await auth.revokeRefreshTokens(student.uid).catch(() => {});
    }

    const otherRestores = await db
      .collection("studentRestores")
      .where("venueId", "==", venue.id)
      .where("studentId", "==", restore.studentId)
      .withConverter(studentRestoreConverter)
      .get();

    const batch = db.batch();

    batch.update(db.doc(`venues/${venue.id}/students/${restore.studentId}`), {
      uid: restore.id,
      updatedAt: Timestamp.now(),
    });

    batch.delete(db.doc(`studentRestores/${restore.id}`));

    for (const doc of otherRestores.docs) {
      if (doc.id !== restore.id && doc.data().status === "pending") {
        batch.update(doc.ref, { status: "revoked" });
      }
    }

    await batch.commit();
  });

export const teacherRejectStudentRestore = publicProcedure
  .input(
    z.strictObject({
      venueId: z.string(),
      studentId: z.string(),
      studentRestoreId: z.string().optional(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher reject student restore received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims, false);

    const restores = await db
      .collection("studentRestores")
      .where("venueId", "==", venue.id)
      .where("studentId", "==", data.studentId)
      .withConverter(studentRestoreConverter)
      .get();

    const batch = db.batch();
    let hasUpdates = false;

    for (const doc of restores.docs) {
      if (
        doc.data().status === "pending" &&
        (!data.studentRestoreId || doc.id === data.studentRestoreId)
      ) {
        batch.update(doc.ref, { status: "revoked" });
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await batch.commit();
    }
  });

export const teacherUpdateStudent = publicProcedure
  .input(
    z.strictObject({
      venueId: z.string(),
      student: z.strictObject({
        id: z.string(),
        userData: studentSchema.shape.userData.unwrap().optional(),
        variantId: z.string().optional(),
        answers: z.record(z.string(), answerSchema).optional(),
        absent: z.boolean().optional(),
        disabled: z.boolean().optional(),
        extraData: z.record(z.string(), z.any()).optional(),
      }),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher update student received", { data });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims, false);

    if (venue.finalized) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già finalizzata" });
    }

    if (
      venue.participationWindow &&
      isPast(venue.participationWindow.start) &&
      isFuture(venue.participationWindow.end)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      });
    }

    const studentRef = db
      .doc(`venues/${venue.id}/students/${data.student.id}`)
      .withConverter(studentConverter);
    const existingDoc = await studentRef.get();
    const existingStudent = existingDoc.data();

    if (!existingStudent && !contest.allowStudentImport) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Aggiunta di studenti non consentita",
      });
    }

    const variants = await getContestVariants(contest.id);
    const variantId =
      data.student.variantId ?? existingStudent?.variantId ?? Object.keys(variants)[0];

    if (contest.hasVariants && variantId && !variants[variantId]) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Variante "${variantId}" non valida`,
      });
    }

    const newUserData = data.student.userData ?? existingStudent?.userData;
    const userDataHash = newUserData ? studentHash(contest, newUserData) : undefined;

    const isAbsent = data.student.absent ?? existingStudent?.absent ?? false;
    const isDisabled = data.student.disabled ?? existingStudent?.disabled ?? false;
    const newAnswers = data.student.answers ?? existingStudent?.answers ?? {};

    const variant = variantId ? variants[variantId] : undefined;
    const score =
      !isAbsent && !isDisabled && variant
        ? calcScore(
            { answers: newAnswers, absent: isAbsent, disabled: isDisabled } as Student,
            variant.schema,
          )
        : undefined;

    if (data.student.disabled && existingStudent?.uid) {
      await auth.revokeRefreshTokens(existingStudent.uid).catch(() => {});
    }

    if (existingStudent) {
      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now(),
      };
      if (data.student.userData !== undefined) {
        updateData.userData = data.student.userData;
        if (userDataHash) updateData.userDataHash = userDataHash;
      }
      if (data.student.variantId !== undefined) {
        updateData.variantId = data.student.variantId;
      }
      if (data.student.answers !== undefined) {
        updateData.answers = data.student.answers;
      }
      if (data.student.absent !== undefined) {
        updateData.absent = data.student.absent;
      }
      if (data.student.disabled !== undefined) {
        updateData.disabled = data.student.disabled;
      }
      if (data.student.extraData !== undefined) {
        updateData.extraData = data.student.extraData;
      }
      if (score === undefined) {
        updateData.score = FieldValue.delete();
      } else {
        updateData.score = score;
      }

      await db.doc(`venues/${venue.id}/students/${data.student.id}`).update(updateData);
    } else {
      await studentRef.set({
        id: data.student.id,
        contestId: contest.id,
        venueId: venue.id,
        userData: data.student.userData ?? {},
        ...(userDataHash ? { userDataHash } : {}),
        ...(variantId ? { variantId } : {}),
        answers: newAnswers,
        absent: isAbsent,
        disabled: isDisabled,
        ...(data.student.extraData ? { extraData: data.student.extraData } : {}),
        ...(score === undefined ? {} : { score }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Student);
    }

    return { id: data.student.id, score };
  });

export const teacherSetStudentsDisabled = publicProcedure
  .input(
    z.strictObject({
      venueId: z.string(),
      studentIds: z.array(z.string()).min(1),
      disabled: z.boolean().default(true),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher set students disabled received", { data });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims, false);

    if (venue.finalized) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già finalizzata" });
    }

    if (
      venue.participationWindow &&
      isPast(venue.participationWindow.start) &&
      isFuture(venue.participationWindow.end)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      });
    }

    if (data.disabled && !contest.allowStudentDelete) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cancellazione studenti non consentita",
      });
    }

    for (const studentChunk of chunk(data.studentIds, 500)) {
      const batch = db.batch();
      for (const studentId of studentChunk) {
        const ref = db.doc(`venues/${venue.id}/students/${studentId}`);
        batch.update(ref, {
          disabled: data.disabled,
          updatedAt: Timestamp.now(),
          ...(data.disabled ? { score: FieldValue.delete() } : {}),
        });
      }
      await batch.commit();
    }

    return { count: data.studentIds.length };
  });

export const teacherImportStudents = publicProcedure
  .input(
    z.strictObject({
      venueId: z.string(),
      students: z
        .array(
          z.strictObject({
            id: z.string().optional(),
            userData: studentSchema.shape.userData.unwrap().required(),
            variantId: z.string().optional(),
            answers: z.record(z.string(), answerSchema).optional().default({}),
            absent: z.boolean().optional().default(false),
            extraData: z.record(z.string(), z.any()).optional().default({ imported: true }),
          }),
        )
        .min(1)
        .max(2000),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher import students received", {
      venueId: data.venueId,
      count: data.students.length,
    });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims, false);

    if (venue.finalized) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gara già finalizzata" });
    }

    if (
      venue.participationWindow &&
      isPast(venue.participationWindow.start) &&
      isFuture(venue.participationWindow.end)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      });
    }

    if (!contest.allowStudentImport) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Importazione studenti non consentita",
      });
    }

    const variants = await getContestVariants(contest.id);
    const defaultVariantId = Object.keys(variants)[0];

    const preparedStudents = data.students.map((student) => {
      const variantId = student.variantId ?? defaultVariantId;
      if (contest.hasVariants && (!variantId || !variants[variantId])) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Variante "${variantId}" non valida`,
        });
      }

      const id = student.id ?? crypto.randomUUID();
      const variant = variantId ? variants[variantId] : undefined;
      const score =
        !student.absent && variant
          ? calcScore(
              { answers: student.answers, absent: student.absent, disabled: false } as Student,
              variant.schema,
            )
          : undefined;
      const userDataHash = studentHash(contest, student.userData);

      return {
        id,
        contestId: contest.id,
        venueId: venue.id,
        userData: student.userData,
        userDataHash,
        ...(variantId ? { variantId } : {}),
        answers: student.answers,
        absent: student.absent,
        disabled: false,
        extraData: student.extraData,
        ...(score === undefined ? {} : { score }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Student;
    });

    for (const studentChunk of chunk(preparedStudents, 500)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        const ref = db
          .doc(`venues/${venue.id}/students/${student.id}`)
          .withConverter(studentConverter);
        batch.set(ref, student);
      }
      await batch.commit();
    }

    return { count: preparedStudents.length };
  });
