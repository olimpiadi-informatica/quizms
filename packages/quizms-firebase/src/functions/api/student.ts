import crypto, { hash } from "node:crypto";

import {
  type Contest,
  getNormalizedUserData,
  type Student,
  studentSchema,
} from "@olinfo/quizms/models";
import { TRPCError } from "@trpc/server";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { auth, db } from "../common";
import { getContest, getParticipationByToken, getRandomVariant, getStudentByHash } from "./queries";
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

    const participation = await getParticipationByToken(data.token);
    if (!participation) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Codice prova non valido" });
    }
    if (participation.contestId !== data.contestId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Codice prova non valido" });
    }

    const contest = await getContest(participation.contestId);

    const uid = crypto.randomUUID();
    const userDataHash = studentHash(contest, data.userData);

    const duplicated = await getStudentByHash(participation.id, userDataHash);
    if (duplicated) {
      if (duplicated.token !== data.token) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Hai già partecipato a questa gara",
        });
      }

      await db.doc(`studentRestores/${uid}`).set({
        studentId: duplicated.id,
        participationId: duplicated.participationId,
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
        participationId: duplicated.participationId,
        variant: duplicated.variant,
      });
    }

    const variant = await getRandomVariant(data.contestId);

    const studentRef = await db.collection(`participations/${participation.id}/students`).add({
      uid,
      userData: data.userData,
      userDataHash,
      absent: false,
      disabled: false,
      participationId: participation.id,
      contestId: data.contestId,
      token: data.token,
      startedAt: participation.startingTime,
      finishedAt: participation.endingTime,
      variant: variant.id,
      answers: {},
      extraData: data.extraData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return auth.createCustomToken(uid, {
      role: "student",
      studentId: studentRef.id,
      participationId: participation.id,
      variant,
    });
  });
