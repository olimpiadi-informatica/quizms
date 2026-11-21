import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Change, FirestoreAuthEvent } from "firebase-functions/firestore";
import { beforeEach, describe, expect, it } from "vitest";

import { submissionConverter } from "~/cli/utils/converters-admin";
import { clearFirestore, makeStudent, makeVariant, seed } from "~/test-utils/emulator";

import { db } from "./common";
import { studentUpdatedHandler } from "./submissions";

const participationWindow = {
  start: new Date("2030-05-10T09:30:00Z"),
  end: new Date("2030-05-10T11:00:00Z"),
};
const TIME = "2030-05-10T10:15:00.000Z";

async function trigger(
  studentPath: string,
  auth: { authType: string; authId?: string } = { authType: "unknown", authId: "uid-s1" },
) {
  const after = await db.doc(studentPath).get();
  const event = {
    data: { before: after, after },
    ...auth,
    time: TIME,
  } as unknown as FirestoreAuthEvent<Change<DocumentSnapshot>>;
  await studentUpdatedHandler(event);
}

async function getSubmissions() {
  const snapshot = await db.collection("submissions").withConverter(submissionConverter).get();
  return snapshot.docs.map((doc) => {
    const { id, ...data } = doc.data();
    expect(id).toBe(doc.id);
    return data;
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

  it("stores a submission for disabled students", async () => {
    await seed(db, {
      students: [makeStudent({ id: "s1", token: "token", participationWindow, disabled: true })],
    });
    await trigger("venues/venue/students/s1");
    const submissions = await getSubmissions();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].student.disabled).toBe(true);
    expect(submissions[0].student).not.toHaveProperty("score");
  });

  it("stores a submission for unauthenticated updates", async () => {
    await seed(db, { students: [makeStudent({ id: "s1", token: "token", participationWindow })] });
    await trigger("venues/venue/students/s1", { authType: "unauthenticated" });
    const [submission] = await getSubmissions();
    expect(submission.authType).toBe("unauthenticated");
    expect(submission).not.toHaveProperty("authId");
  });
});
