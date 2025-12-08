import crypto from "node:crypto";

import { sha256 } from "@noble/hashes/sha2";
import {
  type Contest,
  getNormalizedUserData,
  parseUserData,
  type Student,
} from "@olinfo/quizms/models";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import { auth, db, type Endpoint } from "../common";
import { getContest, getParticipationByToken, getRandomVariant, getStudentByHash } from "./queries";
import type { StudentLogin } from "./schema";

function studentHash(contest: Contest, userData: NonNullable<Student["userData"]>) {
  const hash = sha256(getNormalizedUserData(contest, { userData }));
  return Buffer.from(hash).toString("base64url");
}

export const studentLogin: Endpoint<StudentLogin> = async (_request, data) => {
  logger.info("Student login request received", { data });

  const participation = await getParticipationByToken(data.token);
  if (!participation) {
    return { success: false, errorCode: "INVALID_TOKEN", error: "Codice prova non valido" };
  }
  if (participation.contestId !== data.contestId) {
    return {
      success: false,
      errorCode: "TOKEN_CONTEST_MISMATCH",
      error: "Il token proviene da una gara diversa",
    };
  }

  const contest = await getContest(participation.contestId);

  let userData: NonNullable<Student["userData"]>;
  try {
    userData = Object.fromEntries(
      contest.userData.map((field) => {
        const value = parseUserData(data.userData[field.name], field);
        if (value == null) throw new Error("Missing field");
        return [field.name, value];
      }),
    );
  } catch (error) {
    logger.error("Invalid user data", { error });
    return {
      success: false,
      errorCode: "INVALID_USER_DATA",
      error: "Dati non validi",
    };
  }

  const uid = crypto.randomUUID();
  const userDataHash = studentHash(contest, userData);

  const duplicated = await getStudentByHash(participation.id, userDataHash);
  if (duplicated) {
    if (duplicated.token !== data.token) {
      return {
        success: false,
        errorCode: "MULTIPLE_PARTICIPATION",
        error: "Hai già partecipato a questa gara",
      };
    }

    await db.doc(`studentRestores/${uid}`).set({
      studentId: duplicated.id,
      participationId: duplicated.participationId,
      token: data.token,
      name: userData.name,
      surname: userData.surname,
      approvalCode: Math.round(Math.random() * 1000),
      status: "pending",
      createdAt: Timestamp.now(),
    });

    const token = await auth.createCustomToken(uid, {
      role: "student",
      studentId: duplicated.id,
      participationId: duplicated.participationId,
      variant: duplicated.variant,
    });
    return { success: true, data: { token } };
  }

  const variant = await getRandomVariant(data.contestId);

  const studentRef = await db.collection(`participations/${participation.id}/students`).add({
    uid,
    userData,
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

  const token = await auth.createCustomToken(uid, {
    role: "student",
    studentId: studentRef.id,
    participationId: participation.id,
    variant,
  });
  return { success: true, data: { token } };
};
