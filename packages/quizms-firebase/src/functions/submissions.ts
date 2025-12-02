import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Change, FirestoreEvent } from "firebase-functions/firestore";

import { db } from "./common";

export async function studentUpdatedHandler(
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined>,
) {
  const data = event.data?.after;
  if (!data) return;

  await db.collection("submissions").add({
    studentId: data.id,
    student: data.data(),
    submittedAt: event.time,
  });
}
