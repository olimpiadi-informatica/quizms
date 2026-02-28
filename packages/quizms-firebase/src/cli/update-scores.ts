import { calcScore, type Student } from "@olinfo/quizms/models";
import { info, withProgress } from "@olinfo/quizms/utils-node";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

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
  await withProgress(
    ref.stream() as AsyncIterable<QueryDocumentSnapshot<Student>>,
    count.data().count,
    async (snapshot) => {
      const ref = snapshot.ref;
      await db.runTransaction(async (t) => {
        const studentSnap = await t.get(ref);
        const student = studentSnap.data();
        if (!student?.variant) return;
        const score = calcScore(student, variants[student.variant]?.schema);
        if (score !== student.score) {
          t.update(ref, { score });
        }
      });
    },
  );
}
