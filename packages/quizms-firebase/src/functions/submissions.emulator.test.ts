import { studentSchema } from "@olinfo/quizms/models";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Change, FirestoreAuthEvent } from "firebase-functions/firestore";
import { beforeEach, describe, expect, it } from "vitest";

import { parseSnapshot } from "~/cli/utils/converters-admin";
import { clearFirestore, makeStudent, makeVariant, seed } from "~/test-utils/emulator";

import { db } from "./common";
import { studentUpdatedHandler } from "./submissions";

const participationWindow = {
  start: new Date("2030-05-10T09:30:00Z"),
  end: new Date("2030-05-10T11:00:00Z"),
};
const TIME = "2030-05-10T10:15:00.000Z";

async function trigger(studentPath: string) {
  const after = await db.doc(studentPath).get();
  const event = {
    data: { before: after, after },
    authType: "unknown",
    authId: "uid-s1",
    time: TIME,
  } as unknown as FirestoreAuthEvent<Change<DocumentSnapshot>>;
  await studentUpdatedHandler(event);
}

async function getSubmissions() {
  const snapshot = await db.collection("submissions").get();
  // `submissionConverter.fromFirestore` cannot be used: see the bug in converters-admin.test.ts.
  return snapshot.docs.map((doc) => {
    const { student, ...data } = doc.data();
    return {
      ...data,
      student: parseSnapshot(studentSchema, { id: student.id, data: () => student } as any),
    };
  });
}

beforeEach(async () => {
  await clearFirestore();
  await seed(db, { variants: [makeVariant({ id: "v1" })] });
});

describe("studentUpdatedHandler", () => {
  it("stores a submission with the computed score", async () => {
    const student = makeStudent({
      id: "s1",
      token: "token",
      participationWindow,
      answers: { "1": { type: "openNumber", value: 42 } },
      score: 100,
      updatedAt: new Date(TIME),
    });
    await seed(db, { students: [student] });

    await trigger("venues/venue/students/s1");

    expect(await getSubmissions()).toEqual([
      {
        authType: "unknown",
        authId: "uid-s1",
        studentId: "s1",
        submittedAt: TIME,
        // The score in the student document is ignored and recomputed.
        student: { ...student, score: 5 },
      },
    ]);
  });

  it("ignores deleted students", async () => {
    await trigger("venues/venue/students/missing");
    expect(await getSubmissions()).toEqual([]);
  });

  it("stores one submission per update", async () => {
    await seed(db, { students: [makeStudent({ id: "s1", token: "token", participationWindow })] });
    await trigger("venues/venue/students/s1");
    await trigger("venues/venue/students/s1");
    expect(await getSubmissions()).toHaveLength(2);
  });

  // BUG: `calcScore` returns `undefined` when the student is absent/disabled or the variant does
  // not exist, so `student.score` is `undefined` and the submission write fails with
  // "Cannot use \"undefined\" as a Firestore value (found in field \"student.score\")" because
  // the functions' Firestore instance (src/functions/common.ts) does not set
  // `ignoreUndefinedProperties`. The submission of e.g. a student disabled by the teacher is lost.
  // Fix: call `db.settings({ ignoreUndefinedProperties: true })` in src/functions/common.ts (or
  // omit `score` when it is undefined in src/functions/submissions.ts:21).
  it("stores a submission for disabled students", async () => {
    await seed(db, {
      students: [makeStudent({ id: "s1", token: "token", participationWindow, disabled: true })],
    });
    await trigger("venues/venue/students/s1");
    expect(await getSubmissions()).toHaveLength(1);
  });
});
