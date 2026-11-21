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
import { studentLogin, studentSetLanguage } from "./student";
import { router } from "./trpc";

const appRouter = router({ studentLogin, studentSetLanguage });
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
