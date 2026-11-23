import { pipeline } from "node:stream/promises";

import { calcScore, type Student } from "@olinfo/quizms/models";
import { FieldValue, type QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import type { Request } from "firebase-functions/tasks";

import { studentConverter, variantConverter } from "~/cli/utils/converters-admin";

import { db } from "./common";

export async function updateScoresHandler(request: Request) {
  const { venueId, token } = request.data;

  const variantRef = db.collection("variants").withConverter(variantConverter);
  const variantSnap = await variantRef.get();
  const variants = Object.fromEntries(variantSnap.docs.map((doc) => [doc.id, doc.data()]));

  const ref = db
    .collection(`venues/${venueId}/students`)
    .where("token", "==", token)
    .withConverter(studentConverter);

  await pipeline(ref.stream(), async function* (stream) {
    for await (const data of stream) {
      const snapshot = data as unknown as QueryDocumentSnapshot<Student>;
      const ref = snapshot.ref;
      await db.runTransaction(async (t) => {
        const studentSnap = await t.get(ref);
        const student = studentSnap.data();
        if (!student?.variantId) return;
        const update: Record<string, unknown> = {};

        const score = calcScore(student, variants[student.variantId]?.schema);
        if (score !== student.score) {
          // `calcScore` returns `undefined` for absent or disabled students: remove their score.
          update.score = score ?? FieldValue.delete();
        }

        // A submission request still waiting for the teacher at the end of the contest counts as
        // a submission made when it was requested.
        if (student.status === "pending_approval") {
          update.status = "submitted";
          update.submittedAt = student.terminationRequestedAt ?? Timestamp.now();
          update.submittedBy = "student";
        }

        if (Object.keys(update).length > 0) {
          t.update(ref, update);
        }
      });
    }
  });
}
