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
import { getContest, getRandomVariant, getStudentByHash, getVenueByToken } from "./queries";
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
      variant: variant.id,
      answers: {},
      extraData: data.extraData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return auth.createCustomToken(uid, {
      role: "student",
      studentId: studentRef.id,
      venueId: venue.id,
      variant,
    });
  });
