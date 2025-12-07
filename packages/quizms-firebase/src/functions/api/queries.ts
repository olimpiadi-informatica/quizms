import crypto from "node:crypto";

import { Rng } from "@olinfo/quizms/utils";

import {
  contestConverter,
  participationConverter,
  studentConverter,
  userConverter,
  variantConverter,
} from "~/cli/utils/converters-admin";
import { db } from "~/functions/common";

const rng = new Rng(crypto.randomUUID());

export async function getContest(contestId: string) {
  const snapshot = await db.doc(`contests/${contestId}`).withConverter(contestConverter).get();
  return snapshot.data()!;
}

export async function getParticipation(participationId: string) {
  const snapshot = await db
    .doc(`participations/${participationId}`)
    .withConverter(participationConverter)
    .get();
  return snapshot.data();
}

export async function getParticipationStudents(participationId: string, token: string) {
  const snapshot = await db
    .collection(`participations/${participationId}/students`)
    .where("token", "==", token)
    .withConverter(studentConverter)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function getParticipationByToken(token: string) {
  const snapshot = await db
    .collection("participations")
    .withConverter(participationConverter)
    .where("token", "==", token)
    .get();
  return snapshot.docs[0]?.data();
}

export async function getUser(username: string) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username)
    .withConverter(userConverter)
    .get();
  return snapshot.docs[0]?.data();
}

export async function getRandomVariant(contestId: string) {
  const snapshot = await db
    .collection("variants")
    .withConverter(variantConverter)
    .where("contestId", "==", contestId)
    .where("isOnline", "==", true)
    .get();
  return rng.choice(snapshot.docs).data();
}
export async function getStudentByHash(participationId: string, userDataHash: string) {
  const snapshot = await db
    .collection(`participations/${participationId}/students`)
    .withConverter(studentConverter)
    .where("userDataHash", "==", userDataHash)
    .where("disabled", "!=", true)
    .get();
  return snapshot.docs[0]?.data();
}
