import { pipeline } from "node:stream/promises";

import { calcScore, type Student } from "@olinfo/quizms/models";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { Request } from "firebase-functions/tasks";

import { studentConverter, variantConverter } from "~/cli/utils/converters-admin";

import { db } from "./common";

export async function updateScoresHandler(request: Request) {
  const { participationId, token } = request.data;

  const variantRef = db.collection("variants").withConverter(variantConverter);
  const variantSnap = await variantRef.get();
  const variants = Object.fromEntries(variantSnap.docs.map((doc) => [doc.id, doc.data()]));

  const ref = db
    .collection(`participations/${participationId}/students`)
    .where("token", "==", token)
    .withConverter(studentConverter);

  await pipeline(ref.stream(), async function* (stream) {
    for await (const data of stream) {
      const snapshot = data as unknown as QueryDocumentSnapshot<Student>;
      const ref = snapshot.ref;
      await db.runTransaction(async (t) => {
        const studentSnap = await t.get(ref);
        const student = studentSnap.data();
        if (!student?.variant) return;
        const score = calcScore(student, variants[student.variant]?.schema) ?? null;
        if (score !== student.score) {
          t.update(ref, { score });
        }
      });
    }
  });
}
