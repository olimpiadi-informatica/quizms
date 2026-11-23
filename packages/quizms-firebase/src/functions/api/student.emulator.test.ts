import { hash } from "node:crypto";

import { getNormalizedUserData } from "@olinfo/quizms/models";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { studentConverter } from "~/cli/utils/converters-admin";
import {
  clearFirestore,
  decodeCustomToken,
  makeContest,
  makeStudent,
  makeVariant,
  makeVenue,
  seed,
} from "~/test-utils/emulator";

import { db } from "../common";
import {
  studentLogin,
  studentSetAnswer,
  studentSetLanguage,
  studentSubmitContest,
} from "./student";
import { router } from "./trpc";

const appRouter = router({
  studentLogin,
  studentSetAnswer,
  studentSetLanguage,
  studentSubmitContest,
});
const anonymous = appRouter.createCaller({});
const asStudent = (claims: Partial<DecodedIdToken>) =>
  appRouter.createCaller({ claims: claims as DecodedIdToken });

const NOW = new Date("2030-05-10T10:00:00Z");
const studentWindow = {
  start: new Date("2030-05-10T09:30:00Z"),
  end: new Date("2030-05-10T10:30:00Z"),
};

const contest = makeContest({ id: "contest", languages: ["it", "en"] });
const venue = makeVenue({ id: "venue", token: "venue-token", participationWindow: studentWindow });

const loginInput = {
  contestId: "contest",
  token: "venue-token",
  userData: { name: "Mario", surname: "Rossi" },
  extraData: { browser: "test" },
};

function userDataHash(userData: { name: string; surname: string }) {
  return hash("sha256", getNormalizedUserData(contest, { userData }));
}

async function getStudents(venueId = "venue") {
  const snapshot = await db
    .collection(`venues/${venueId}/students`)
    .withConverter(studentConverter)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  await clearFirestore();
  await seed(db, {
    contests: [contest, makeContest({ id: "other-contest" })],
    venues: [
      venue,
      makeVenue({ id: "other-venue", contestId: "other-contest", token: "other-token" }),
    ],
    variants: [
      makeVariant({ id: "v1" }),
      makeVariant({ id: "offline", isOnline: false }),
      makeVariant({ id: "other", contestId: "other-contest" }),
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("studentLogin", () => {
  it("creates a new student", async () => {
    const token = await anonymous.studentLogin(loginInput);

    const students = await getStudents();
    expect(students).toHaveLength(1);
    const [student] = students;
    expect(student).toEqual({
      id: expect.any(String),
      uid: expect.any(String),
      userData: { name: "Mario", surname: "Rossi" },
      userDataHash: userDataHash({ name: "Mario", surname: "Rossi" }),
      absent: false,
      disabled: false,
      venueId: "venue",
      contestId: "contest",
      token: "venue-token",
      participationWindow: studentWindow,
      variantId: "v1",
      answers: {},
      extraData: { browser: "test" },
      createdAt: NOW,
      updatedAt: NOW,
    });

    const { uid, claims } = decodeCustomToken(token);
    expect(uid).toBe(student.uid);
    expect(claims).toEqual({
      role: "student",
      studentId: student.id,
      venueId: "venue",
      variantId: "v1",
    });
  });

  it("assigns only online variants of the contest", async () => {
    for (let i = 0; i < 10; i++) {
      await anonymous.studentLogin({
        ...loginInput,
        userData: { name: "Mario", surname: `Rossi${"i".repeat(i)}` },
      });
    }
    const students = await getStudents();
    expect(students).toHaveLength(10);
    expect(new Set(students.map((s) => s.variantId))).toEqual(new Set(["v1"]));
  });

  it("rejects an invalid token", async () => {
    await expect(anonymous.studentLogin({ ...loginInput, token: "wrong" })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Codice prova non valido" }),
    );
    expect(await getStudents()).toEqual([]);
  });

  it("rejects a token of a venue of another contest", async () => {
    await expect(anonymous.studentLogin({ ...loginInput, token: "other-token" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Codice prova non valido" }),
    );
    expect(await getStudents("other-venue")).toEqual([]);
  });

  it("rejects incomplete user data", async () => {
    await expect(
      anonymous.studentLogin({ ...loginInput, userData: { name: "Mario" } as any }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });

  it("restores a student that logs in again with the same token", async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "existing",
          uid: "old-uid",
          token: "venue-token",
          participationWindow: studentWindow,
          userDataHash: userDataHash({ name: "Mario", surname: "Rossi" }),
        }),
      ],
    });

    // The duplicate check is case insensitive and ignores accents and whitespace.
    const token = await anonymous.studentLogin({
      ...loginInput,
      userData: { name: " MARIO", surname: "rossì" },
    });

    expect(await getStudents()).toHaveLength(1);

    const { uid, claims } = decodeCustomToken(token);
    expect(uid).not.toBe("old-uid");
    expect(claims).toEqual({
      role: "student",
      studentId: "existing",
      venueId: "venue",
      variantId: "v1",
    });

    const restore = await db.doc(`studentRestores/${uid}`).get();
    expect(restore.data()).toEqual({
      studentId: "existing",
      venueId: "venue",
      token: "venue-token",
      name: " MARIO",
      surname: "rossì",
      approvalCode: expect.any(Number),
      status: "pending",
      createdAt: expect.anything(),
    });
    expect(restore.data()?.createdAt.toDate()).toEqual(NOW);
  });

  it("rejects a student that already participated with another token", async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "existing",
          token: "previous-token",
          participationWindow: studentWindow,
          userDataHash: userDataHash({ name: "Mario", surname: "Rossi" }),
        }),
      ],
    });

    await expect(anonymous.studentLogin(loginInput)).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Hai già partecipato a questa gara" }),
    );
    expect(await getStudents()).toHaveLength(1);
    expect((await db.collection("studentRestores").get()).empty).toBe(true);
  });

  it("ignores disabled students", async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "deleted",
          token: "venue-token",
          disabled: true,
          participationWindow: studentWindow,
          userDataHash: userDataHash({ name: "Mario", surname: "Rossi" }),
        }),
      ],
    });

    const token = await anonymous.studentLogin(loginInput);
    const { claims } = decodeCustomToken(token);
    expect(claims.studentId).not.toBe("deleted");
    expect(await getStudents()).toHaveLength(2);
  });
});

describe("studentSetLanguage", () => {
  const claims = { role: "student", uid: "uid-s1", venueId: "venue", studentId: "s1" };

  beforeEach(async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "s1",
          token: "venue-token",
          participationWindow: studentWindow,
          updatedAt: new Date("2030-05-10T09:00:00Z"),
        }),
      ],
    });
  });

  async function getStudent() {
    const snapshot = await db.doc("venues/venue/students/s1").withConverter(studentConverter).get();
    return snapshot.data();
  }

  it("sets the language", async () => {
    await asStudent(claims).studentSetLanguage({ language: "en" });
    expect(await getStudent()).toMatchObject({ language: "en", updatedAt: NOW });
  });

  it("allows changing the language after the end of the contest", async () => {
    vi.setSystemTime(new Date("2030-05-11T00:00:00Z"));
    await asStudent(claims).studentSetLanguage({ language: "en" });
    expect((await getStudent())?.language).toBe("en");
  });

  it("rejects languages not supported by the contest", async () => {
    await expect(asStudent(claims).studentSetLanguage({ language: "fr" })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Lingua non valida" }),
    );
    expect((await getStudent())?.language).toBeUndefined();
  });

  it("defaults to italian for contests without languages", async () => {
    await db.doc("contests/contest").update({ languages: FieldValue.delete() });
    await expect(asStudent(claims).studentSetLanguage({ language: "en" })).rejects.toThrow(
      expect.objectContaining({ message: "Lingua non valida" }),
    );
    await asStudent(claims).studentSetLanguage({ language: "it" });
    expect((await getStudent())?.language).toBe("it");
  });

  it.each([
    ["without claims", undefined],
    ["with a teacher token", { role: "teacher", schoolId: "school" }],
    ["without venueId", { ...claims, venueId: undefined }],
    ["without studentId", { ...claims, studentId: undefined }],
  ])("rejects requests %s", async (_, claims) => {
    const caller = claims ? asStudent(claims) : anonymous;
    await expect(caller.studentSetLanguage({ language: "en" })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );
  });

  it("rejects a non-existing student", async () => {
    await expect(
      asStudent({ ...claims, studentId: "missing" }).studentSetLanguage({ language: "en" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND", message: "Studente non trovato" }),
    );
  });

  it("rejects a different user", async () => {
    await expect(
      asStudent({ ...claims, uid: "someone-else" }).studentSetLanguage({ language: "en" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Sessione non valida" }),
    );
    expect((await getStudent())?.language).toBeUndefined();
  });

  it("rejects a disabled student", async () => {
    await db.doc("venues/venue/students/s1").update({ disabled: true });
    await expect(asStudent(claims).studentSetLanguage({ language: "en" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Utente disabilitato" }),
    );
  });
});

describe("studentSetAnswer", () => {
  const claims = { role: "student", uid: "uid-s1", venueId: "venue", studentId: "s1" };

  beforeEach(async () => {
    const base = makeVariant({ id: "v1" });
    await seed(db, {
      variants: [
        makeVariant({
          id: "v1",
          schema: {
            ...base.schema,
            "3.1": { ...base.schema["1"], originalId: "3.1" },
            "3.2": { ...base.schema["1"], originalId: "3.2" },
          },
        }),
      ],
      students: [
        makeStudent({
          id: "s1",
          token: "venue-token",
          participationWindow: studentWindow,
          answers: { "2": { type: "multipleChoice", value: "A" } },
          updatedAt: new Date("2030-05-10T09:00:00Z"),
        }),
      ],
    });
  });

  async function getStudent() {
    const snapshot = await db.doc("venues/venue/students/s1").withConverter(studentConverter).get();
    return snapshot.data();
  }

  it("sets an answer without touching the others", async () => {
    await asStudent(claims).studentSetAnswer({
      problemId: "1",
      answer: { type: "openNumber", value: 42 },
    });
    expect(await getStudent()).toMatchObject({
      answers: {
        "1": { type: "openNumber", value: 42 },
        "2": { type: "multipleChoice", value: "A" },
      },
      updatedAt: NOW,
    });
  });

  it("keeps sub-problem ids containing a dot as a single key", async () => {
    await asStudent(claims).studentSetAnswer({
      problemId: "3.1",
      answer: { type: "openNumber", value: 7 },
    });
    await asStudent(claims).studentSetAnswer({
      problemId: "3.2",
      answer: { type: "openNumber", value: 8 },
    });

    const snapshot = await db.doc("venues/venue/students/s1").get();
    expect(snapshot.get("answers")).toEqual({
      "2": { type: "multipleChoice", value: "A" },
      "3.1": { type: "openNumber", value: 7 },
      "3.2": { type: "openNumber", value: 8 },
    });
  });

  it("clears an answer", async () => {
    await asStudent(claims).studentSetAnswer({
      problemId: "2",
      answer: { type: "multipleChoice" },
    });
    const snapshot = await db.doc("venues/venue/students/s1").get();
    expect(snapshot.get("answers")).toEqual({ "2": { type: "multipleChoice" } });
  });

  it.each([
    ["an unknown problem", "9", "Domanda non valida"],
    ["a path-like id", "1/x", "Domanda non valida"],
    ["an answer of the wrong type", "2", "Tipo di risposta non valido"],
  ])("rejects %s", async (_, problemId, message) => {
    await expect(
      asStudent(claims).studentSetAnswer({ problemId, answer: { type: "openNumber", value: 1 } }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST", message }));
    expect((await getStudent())?.answers).toEqual({ "2": { type: "multipleChoice", value: "A" } });
  });

  it("rejects an empty problem id", async () => {
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "",
        answer: { type: "openNumber", value: 1 },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });

  it("accepts answers during the 10 seconds after the end", async () => {
    vi.setSystemTime(new Date("2030-05-10T10:30:09Z"));
    await asStudent(claims).studentSetAnswer({
      problemId: "1",
      answer: { type: "openNumber", value: 42 },
    });
    expect((await getStudent())?.answers?.["1"]).toEqual({ type: "openNumber", value: 42 });
  });

  it.each([
    ["before the start", "2030-05-10T09:29:59Z", "Gara non iniziata"],
    ["after the grace period", "2030-05-10T10:30:11Z", "Gara già terminata"],
  ])("rejects answers %s", async (_, now, message) => {
    vi.setSystemTime(new Date(now));
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "1",
        answer: { type: "openNumber", value: 42 },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN", message }));
    expect((await getStudent())?.answers?.["1"]).toBeUndefined();
  });

  it("rejects a student without a participation window", async () => {
    await db.doc("venues/venue/students/s1").update({ participationWindow: FieldValue.delete() });
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "1",
        answer: { type: "openNumber", value: 42 },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN", message: "Gara non iniziata" }));
  });

  it("rejects a student of a previous window of the venue", async () => {
    await db.doc("venues/venue").update({ token: "new-token" });
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "1",
        answer: { type: "openNumber", value: 42 },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non valida o terminata" }),
    );
  });

  it.each([
    ["a disabled student", { disabled: true }, "Utente disabilitato"],
    ["another session", { uid: "someone-else" }, "Sessione non valida"],
  ])("rejects %s", async (_, update, message) => {
    await db.doc("venues/venue/students/s1").update(update);
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "1",
        answer: { type: "openNumber", value: 42 },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN", message }));
  });

  it("rejects requests without student claims", async () => {
    await expect(
      anonymous.studentSetAnswer({ problemId: "1", answer: { type: "openNumber", value: 42 } }),
    ).rejects.toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
  });
});

describe("studentSubmitContest", () => {
  const claims = { role: "student", uid: "uid-s1", venueId: "venue", studentId: "s1" };

  beforeEach(async () => {
    await seed(db, {
      students: [
        makeStudent({ id: "s1", token: "venue-token", participationWindow: studentWindow }),
      ],
    });
  });

  async function getStudent() {
    const snapshot = await db.doc("venues/venue/students/s1").withConverter(studentConverter).get();
    return snapshot.data();
  }

  async function getWindow() {
    return (await getStudent())?.participationWindow;
  }

  it("marks the student as submitted and keeps the participation window", async () => {
    await asStudent(claims).studentSubmitContest();
    const student = await getStudent();
    expect(student?.participationWindow).toEqual(studentWindow);
    expect(student?.status).toBe("submitted");
    expect(student?.submittedAt).toEqual(NOW);
    expect(student?.submittedBy).toBe("student");
  });

  it("accepts submissions during the grace period", async () => {
    vi.setSystemTime(new Date("2030-05-10T10:30:05Z"));
    await asStudent(claims).studentSubmitContest();
    const student = await getStudent();
    expect(student?.participationWindow).toEqual(studentWindow);
    expect(student?.status).toBe("submitted");
  });

  it("is idempotent", async () => {
    await asStudent(claims).studentSubmitContest();
    vi.setSystemTime(new Date("2030-05-10T10:00:05Z"));
    await asStudent(claims).studentSubmitContest();
    const student = await getStudent();
    expect(student?.participationWindow).toEqual(studentWindow);
    expect(student?.submittedAt).toEqual(NOW);
  });

  describe("with teacher approval", () => {
    beforeEach(async () => {
      await seed(db, {
        contests: [
          makeContest({
            id: "contest",
            languages: ["it", "en"],
            onlineSettings: {
              contestWindow: {
                start: new Date("2030-05-10T08:00:00Z"),
                end: new Date("2030-05-10T18:00:00Z"),
              },
              duration: 60,
              allowRestart: false,
              terminationMode: "teacher_approval",
            },
          }),
        ],
      });
    });

    it("requests the submission instead of submitting", async () => {
      await asStudent(claims).studentSubmitContest();
      const student = await getStudent();
      expect(student?.status).toBe("pending_approval");
      expect(student?.terminationRequestedAt).toEqual(NOW);
      expect(student?.submittedAt).toBeUndefined();
      expect(student?.participationWindow).toEqual(studentWindow);
    });

    it("keeps the first request time when submitting again", async () => {
      await asStudent(claims).studentSubmitContest();
      vi.setSystemTime(new Date("2030-05-10T10:00:05Z"));
      await asStudent(claims).studentSubmitContest();
      expect((await getStudent())?.terminationRequestedAt).toEqual(NOW);
    });

    it("rejects answers while waiting for the teacher", async () => {
      await asStudent(claims).studentSubmitContest();
      await expect(
        asStudent(claims).studentSetAnswer({
          problemId: "1",
          answer: { type: "openNumber", value: 42 },
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: "FORBIDDEN", message: "Consegna in attesa di conferma" }),
      );
      expect((await getStudent())?.answers?.["1"]).toBeUndefined();
    });
  });

  it("rejects answers after submitting", async () => {
    await asStudent(claims).studentSubmitContest();
    vi.setSystemTime(new Date("2030-05-10T10:00:11Z"));
    await expect(
      asStudent(claims).studentSetAnswer({
        problemId: "1",
        answer: { type: "openNumber", value: 42 },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già terminata" }),
    );
  });

  it.each([
    ["before the start", "2030-05-10T09:29:59Z", "Gara non iniziata"],
    ["after the grace period", "2030-05-10T10:30:11Z", "Gara già terminata"],
  ])("rejects submissions %s", async (_, now, message) => {
    vi.setSystemTime(new Date(now));
    await expect(asStudent(claims).studentSubmitContest()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message }),
    );
    expect(await getWindow()).toEqual(studentWindow);
    expect((await getStudent())?.status).toBeUndefined();
  });

  it("rejects requests without student claims", async () => {
    await expect(anonymous.studentSubmitContest()).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });
});
