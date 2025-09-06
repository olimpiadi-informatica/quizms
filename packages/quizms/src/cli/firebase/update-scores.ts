import { pipeline } from "node:stream/promises";

import { SingleBar } from "cli-progress";
import { formatDistanceStrict } from "date-fns";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

import { calcScore, type Student } from "~/models";
import { info } from "~/utils/logs";

import { studentConverter, variantConverter } from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

export default async function updateScores() {
  const { db } = await initializeFirebase();

  info("Updating student scores.");

  const variantRef = db.collection("variants").withConverter(variantConverter);
  const variantSnap = await variantRef.get();
  const variants = Object.fromEntries(variantSnap.docs.map((doc) => [doc.id, doc.data()]));

  const ref = db.collectionGroup("students").withConverter(studentConverter);

  const count = await ref.count().get();
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
    etaBuffer: 10000,
    formatTime: (t) => formatDistanceStrict(0, t * 1000),
  });

  bar.start(count.data().count, 0);
  await pipeline(ref.stream(), async function* (stream) {
    const promises: Promise<void>[] = [];
    for await (const data of stream) {
      const snapshot = data as unknown as QueryDocumentSnapshot<Student>;
      const ref = snapshot.ref;
      promises.push(
        db
          .runTransaction(async (t) => {
            const studentSnap = await t.get(ref);
            const student = studentSnap.data();
            if (!student?.variant) return;
            const score = calcScore(student, variants[student.variant]?.schema) ?? null;
            if (score !== student.score) {
              t.update(ref, { score });
            }
          })
          .then(() => bar.increment()),
      );
    }
    await Promise.all(promises);
  });
  bar.stop();
}
