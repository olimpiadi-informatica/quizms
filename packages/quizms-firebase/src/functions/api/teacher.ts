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
import { type DocumentSnapshot, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { chunk, isEqual, uniq } from "lodash-es";
import z from "zod";

import {
  studentConverter,
  studentRestoreConverter,
  venueConverter,
} from "~/cli/utils/converters-admin";

import { auth, db } from "../common";
import { apiError } from "./errors";
import {
  getContest,
  getContestVariants,
  getUser,
  getVenue,
  getVenueByToken,
  getVenueStudents,
} from "./queries";
import { docId } from "./schemas";
import { studentHash } from "./student";
import { publicProcedure, teacherProcedure } from "./trpc";

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
    logger.info("Teacher login request received", { username: data.username });

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
  schoolId: string,
  onlineOnly: boolean,
): Promise<[Venue, Contest]> {
  const venue = await getVenue(venueId);
  if (!venue) {
    throw apiError("BAD_REQUEST", "invalidContest");
  }

  if (venue.schoolId !== schoolId) {
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

export const teacherStartContestWindow = teacherProcedure
  .input(z.strictObject({ venueId: docId }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher start venue received", { data });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims.schoolId, true);

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

export const teacherStopContestWindow = teacherProcedure
  .input(z.strictObject({ venueId: docId }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher stop venue received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims.schoolId, true);

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

export const teacherFinalizeVenue = teacherProcedure
  .input(z.strictObject({ venueId: docId }))
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher finalize venue received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims.schoolId, false);

    await db.doc(`venues/${venue.id}`).update({ finalized: true });
  });

/**
 * Students can be edited only before the contest starts or after it ends, and only until the
 * venue is finalized. This matches the teacher table, which is frozen during the same period.
 */
function assertVenueEditable(venue: Venue) {
  if (venue.finalized) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gara già finalizzata" });
  }
  if (venue.participationWindow && isFuture(venue.participationWindow.end)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gara in corso, modifiche non consentite" });
  }
}

function venueRef(venueId: string) {
  return db.doc(`venues/${venueId}`).withConverter(venueConverter);
}

function studentRef(venueId: string, studentId: string) {
  return db.doc(`venues/${venueId}/students/${studentId}`).withConverter(studentConverter);
}

export const teacherApproveStudentRestore = teacherProcedure
  .input(
    z.strictObject({
      venueId: docId,
      studentRestoreId: docId,
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher approve student restore received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims.schoolId, false);

    const previousUid = await db.runTransaction(async (t) => {
      const restore = (
        await t.get(
          db.doc(`studentRestores/${data.studentRestoreId}`).withConverter(studentRestoreConverter),
        )
      ).data();
      if (!restore || restore.venueId !== venue.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Richiesta non trovata" });
      }
      if (restore.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Richiesta non più valida" });
      }

      const ref = studentRef(venue.id, restore.studentId);
      const student = (await t.get(ref)).data();
      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Studente non trovato" });
      }

      const otherRestores = await t.get(
        db
          .collection("studentRestores")
          .where("venueId", "==", venue.id)
          .where("studentId", "==", restore.studentId)
          .withConverter(studentRestoreConverter),
      );

      t.update(ref, { uid: restore.id, updatedAt: Timestamp.now() });
      t.delete(db.doc(`studentRestores/${restore.id}`));
      for (const doc of otherRestores.docs) {
        if (doc.id !== restore.id && doc.data().status === "pending") {
          t.update(doc.ref, { status: "revoked" });
        }
      }

      return student.uid;
    });

    if (previousUid) {
      await auth.revokeRefreshTokens(previousUid).catch(() => {});
    }
  });

export const teacherRejectStudentRestore = teacherProcedure
  .input(
    z.strictObject({
      venueId: docId,
      studentId: docId,
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher reject student restore received", { data });

    const [venue] = await checkVenue(data.venueId, ctx.claims.schoolId, false);

    const restores = await db
      .collection("studentRestores")
      .where("venueId", "==", venue.id)
      .where("studentId", "==", data.studentId)
      .withConverter(studentRestoreConverter)
      .get();

    const batch = db.batch();
    let hasUpdates = false;

    for (const doc of restores.docs) {
      if (doc.data().status === "pending") {
        batch.update(doc.ref, { status: "revoked" });
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await batch.commit();
    }
  });

export const teacherUpdateStudent = teacherProcedure
  .input(
    z.strictObject({
      venueId: docId,
      student: z.strictObject({
        id: docId,
        userData: studentSchema.shape.userData.unwrap().optional(),
        variantId: docId.nullable().optional(),
        answers: z.record(z.string(), answerSchema).optional(),
        absent: z.boolean().optional(),
        disabled: z.boolean().optional(),
        extraData: z.record(z.string(), z.any()).optional(),
      }),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher update student received", {
      venueId: data.venueId,
      studentId: data.student.id,
    });

    const [{ id: venueId }, contest] = await checkVenue(data.venueId, ctx.claims.schoolId, false);
    const variants = await getContestVariants(contest.id);

    const { score, revokeUid } = await db.runTransaction(async (t) => {
      assertVenueEditable((await t.get(venueRef(venueId))).data()!);

      const ref = studentRef(venueId, data.student.id);
      const existing = (await t.get(ref)).data();

      // The client sends the whole student: only the fields that actually change are checked
      // against the permissions of the contest.
      const changes = (field: "answers" | "absent" | "disabled", fallback: unknown) =>
        data.student[field] !== undefined &&
        !isEqual(data.student[field], existing?.[field] ?? fallback);

      if (!existing && !contest.allowStudentImport) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Aggiunta di studenti non consentita" });
      }
      if (
        existing &&
        data.student.userData !== undefined &&
        !isEqual(data.student.userData, existing.userData) &&
        !contest.allowStudentEdit
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Modifica dei dati degli studenti non consentita",
        });
      }
      if ((changes("answers", {}) || changes("absent", false)) && !contest.allowAnswerEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Modifica delle risposte non consentita",
        });
      }
      if (data.student.disabled && changes("disabled", false) && !contest.allowStudentDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cancellazione studenti non consentita",
        });
      }

      const defaultVariantId = contest.hasVariants ? undefined : Object.keys(variants)[0];
      const variantId =
        contest.hasVariants && data.student.variantId === null
          ? undefined
          : (data.student.variantId ?? existing?.variantId ?? defaultVariantId);
      if (contest.hasVariants && variantId && !variants[variantId]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Variante "${variantId}" non valida` });
      }

      const absent = data.student.absent ?? existing?.absent ?? false;
      const disabled = data.student.disabled ?? existing?.disabled ?? false;
      const answers = data.student.answers ?? existing?.answers ?? {};
      const variant = variantId ? variants[variantId] : undefined;
      const score = calcScore({ id: data.student.id, answers, absent, disabled }, variant?.schema);

      if (existing) {
        const updateData: Record<string, any> = {
          updatedAt: Timestamp.now(),
          score: score ?? FieldValue.delete(),
        };
        if (data.student.userData !== undefined) {
          updateData.userData = data.student.userData;
          // Only students that logged in online have a hash, used to detect duplicate logins:
          // keep it in sync, but never add one to students created by the teacher.
          if (existing.userDataHash) {
            updateData.userDataHash = studentHash(contest, data.student.userData);
          }
        }
        if (data.student.variantId !== undefined) {
          updateData.variantId = variantId ?? FieldValue.delete();
        }
        if (data.student.answers !== undefined) updateData.answers = data.student.answers;
        if (data.student.absent !== undefined) updateData.absent = data.student.absent;
        if (data.student.disabled !== undefined) updateData.disabled = data.student.disabled;
        if (data.student.extraData !== undefined) updateData.extraData = data.student.extraData;
        t.update(ref, updateData);
      } else {
        const now = new Date();
        const student: Student = {
          id: data.student.id,
          contestId: contest.id,
          venueId,
          userData: data.student.userData ?? {},
          answers,
          absent,
          disabled,
          createdAt: now,
          updatedAt: now,
        };
        if (variantId) student.variantId = variantId;
        if (data.student.extraData) student.extraData = data.student.extraData;
        if (score !== undefined) student.score = score;
        t.set(ref, student);
      }

      const revokeUid =
        data.student.disabled && changes("disabled", false) ? existing?.uid : undefined;
      return { score, revokeUid };
    });

    if (revokeUid) {
      await auth.revokeRefreshTokens(revokeUid).catch(() => {});
    }

    return { id: data.student.id, score };
  });

export const teacherSetStudentsDisabled = teacherProcedure
  .input(
    z.strictObject({
      venueId: docId,
      studentIds: z.array(docId).min(1).max(2000),
      disabled: z.boolean(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Teacher set students disabled received", {
      venueId: data.venueId,
      count: data.studentIds.length,
      disabled: data.disabled,
    });

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims.schoolId, false);
    assertVenueEditable(venue);

    if (data.disabled && !contest.allowStudentDelete) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cancellazione studenti non consentita" });
    }

    // Check every student before writing anything, so that a wrong id doesn't leave the
    // operation half done.
    const refs = uniq(data.studentIds).map((id) => studentRef(venue.id, id));
    const snapshots = (await db.getAll(...refs)) as DocumentSnapshot<Student>[];
    const missing = snapshots.filter((snap) => !snap.exists).map((snap) => snap.id);
    if (missing.length > 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Studenti non trovati: ${missing.join(", ")}`,
      });
    }
    const students = snapshots.map((snap) => snap.data()!);

    const variants = data.disabled ? {} : await getContestVariants(contest.id);

    for (const studentChunk of chunk(students, 500)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        // Re-enabled students get their score back.
        const variant = student.variantId ? variants[student.variantId] : undefined;
        const score = data.disabled
          ? undefined
          : calcScore({ ...student, disabled: false }, variant?.schema);
        batch.update(studentRef(venue.id, student.id), {
          disabled: data.disabled,
          updatedAt: Timestamp.now(),
          score: score ?? FieldValue.delete(),
        });
      }
      await batch.commit();
    }

    if (data.disabled) {
      await revokeTokens(students);
    }

    return { count: students.length };
  });

export const teacherImportStudents = teacherProcedure
  .input(
    z.strictObject({
      venueId: docId,
      students: z
        .array(
          z.strictObject({
            id: docId.optional(),
            userData: studentSchema.shape.userData.unwrap().required(),
            variantId: docId.nullable().optional(),
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

    const [venue, contest] = await checkVenue(data.venueId, ctx.claims.schoolId, false);
    assertVenueEditable(venue);

    if (!contest.allowStudentImport) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Importazione studenti non consentita" });
    }
    if (
      !contest.allowAnswerEdit &&
      data.students.some((student) => Object.keys(student.answers).length > 0 || student.absent)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Importazione delle risposte non consentita",
      });
    }

    const variants = await getContestVariants(contest.id);
    const defaultVariantId = Object.keys(variants)[0];

    const now = new Date();
    const preparedStudents = data.students.map((student): Student => {
      const variantId = student.variantId ?? defaultVariantId;
      if (contest.hasVariants && (!variantId || !variants[variantId])) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Variante "${variantId}" non valida` });
      }

      const id = student.id ?? crypto.randomUUID();
      const variant = variantId ? variants[variantId] : undefined;
      const score = calcScore(
        { id, answers: student.answers, absent: student.absent, disabled: false },
        variant?.schema,
      );

      // Imported students don't get a `userDataHash`: it is only used to detect students that
      // log in online more than once.
      const prepared: Student = {
        id,
        contestId: contest.id,
        venueId: venue.id,
        userData: student.userData,
        answers: student.answers,
        absent: student.absent,
        disabled: false,
        extraData: student.extraData,
        createdAt: now,
        updatedAt: now,
      };
      if (variantId) prepared.variantId = variantId;
      if (score !== undefined) prepared.score = score;
      return prepared;
    });

    // Never overwrite existing students: check every id before writing anything.
    const ids = preparedStudents.map((student) => student.id);
    if (uniq(ids).length !== ids.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Id degli studenti duplicati" });
    }
    const existing = (await db.getAll(...ids.map((id) => studentRef(venue.id, id)))).filter(
      (snap) => snap.exists,
    );
    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Studenti già esistenti: ${existing.map((snap) => snap.id).join(", ")}`,
      });
    }

    for (const studentChunk of chunk(preparedStudents, 500)) {
      const batch = db.batch();
      for (const student of studentChunk) {
        batch.create(studentRef(venue.id, student.id), student);
      }
      await batch.commit();
    }

    return { count: preparedStudents.length };
  });
