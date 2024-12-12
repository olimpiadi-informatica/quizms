import { calcScore } from "~/models";
import { info, success } from "~/utils/logs";

import { studentConverter, variantConverter } from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

export default async function updateScores() {
  const { db } = await initializeFirebase();

  info("Updating student scores.");

  const variantRef = db.collection("variants").withConverter(variantConverter);
  const variantSnap = await variantRef.get();
  const variants = Object.fromEntries(variantSnap.docs.map((doc) => [doc.id, doc.data()]));

  const ref = db.collectionGroup("students").withConverter(studentConverter).limit(10_000);
  let snapshot = await ref.get();

  let sum = 0;
  while (!snapshot.empty) {
    await Promise.all(
      snapshot.docs.map((doc) =>
        db.runTransaction(async (t) => {
          const studentSnap = await t.get(doc.ref);
          const student = studentSnap.data();
          if (!student?.variant || student.absent || student.disabled) return;
          const score = calcScore(student, variants[student.variant]?.schema);
          t.update(doc.ref, { score });
        }),
      ),
    );

    sum += snapshot.size;
    info(`${sum} students updated.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).get();
  }

  success("All students updated.");
}
