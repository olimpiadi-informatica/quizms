import { calcScore, studentSchema } from "@olinfo/quizms/models";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Change, FirestoreAuthEvent } from "firebase-functions/firestore";

import { parseSnapshot, submissionConverter, variantConverter } from "~/cli/utils/converters-admin";

import { db } from "./common";

export async function studentUpdatedHandler(
  event: FirestoreAuthEvent<Change<DocumentSnapshot> | undefined>,
) {
  const data = event.data?.after;
  if (!data?.exists) return;

  const student = parseSnapshot(studentSchema, data);

  const variant = student.variantId
    ? await db.doc(`variants/${student.variantId}`).withConverter(variantConverter).get()
    : undefined;
  // Firestore rejects `undefined` values: leave out the fields that are not set.
  const score = calcScore(student, variant?.data()?.schema);
  if (score === undefined) {
    delete student.score;
  } else {
    student.score = score;
  }

  const ref = db.collection("submissions").doc().withConverter(submissionConverter);
  await ref.set({
    id: ref.id,
    authType: event.authType,
    ...(event.authId !== undefined && { authId: event.authId }),
    studentId: data.id,
    student,
    submittedAt: event.time,
  });
}
