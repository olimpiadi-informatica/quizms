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

  const variant = await db.doc(`variants/${student.variant}`).withConverter(variantConverter).get();
  student.score = calcScore(student, variant.data()?.schema);

  await db.collection("submissions").withConverter(submissionConverter).add({
    authType: event.authType,
    authId: event.authId,
    studentId: data.id,
    student,
    submittedAt: event.time,
  });
}
