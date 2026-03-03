import { Rng } from "@olinfo/quizms/utils";

import {
  contestConverter,
  studentConverter,
  userConverter,
  variantConverter,
  venueConverter,
} from "~/cli/utils/converters-admin";
import { db } from "~/functions/common";

const rng = new Rng();

export async function getContest(contestId: string) {
  const snapshot = await db.doc(`contests/${contestId}`).withConverter(contestConverter).get();
  return snapshot.data()!;
}

export async function getVenue(venueId: string) {
  const snapshot = await db.doc(`venues/${venueId}`).withConverter(venueConverter).get();
  return snapshot.data();
}

export async function getVenueStudents(venueId: string, token: string) {
  const snapshot = await db
    .collection(`venues/${venueId}/students`)
    .where("token", "==", token)
    .withConverter(studentConverter)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function getVenueByToken(token: string) {
  const snapshot = await db
    .collection("venues")
    .withConverter(venueConverter)
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
export async function getStudentByHash(venueId: string, userDataHash: string) {
  const snapshot = await db
    .collection(`venues/${venueId}/students`)
    .withConverter(studentConverter)
    .where("userDataHash", "==", userDataHash)
    .where("disabled", "!=", true)
    .get();
  return snapshot.docs[0]?.data();
}
