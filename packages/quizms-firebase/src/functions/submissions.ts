import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Change, FirestoreAuthEvent } from "firebase-functions/firestore";

import { db } from "./common";

export async function studentUpdatedHandler(
  event: FirestoreAuthEvent<Change<DocumentSnapshot> | undefined>,
) {
  const data = event.data?.after;
  if (!data?.exists) return;

  await db.collection("submissions").add({
    authType: event.authType,
    authId: event.authId,
    studentId: data.id,
    student: data.data(),
    submittedAt: event.time,
  });
}
