import { info, success } from "@olinfo/quizms/utils-node";
import type { Firestore } from "firebase-admin/firestore";

import { initializeFirebase } from "./utils/initialize";

// A batch can contain at most 500 writes.
const BATCH_SIZE = 500;

/** Sets `finalized` to `false` on every finalized venue, returning how many were changed. */
export async function definalizeVenues(db: Firestore): Promise<number> {
  const query = db.collection("venues").where("finalized", "==", true).limit(BATCH_SIZE);

  let sum = 0;
  for (;;) {
    // Definalized venues no longer match the query: always read the first page again.
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { finalized: false });
    }
    await batch.commit();

    sum += snapshot.size;
    info(`Definalized ${sum} venues.`);
  }

  return sum;
}

export default async function definalize() {
  const { db } = await initializeFirebase();

  info("Definalizing all venues.");
  const sum = await definalizeVenues(db);
  success(`${sum} venues were successfully definalized.`);
}
