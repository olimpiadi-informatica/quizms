import { contestSchema, studentSchema } from "@olinfo/quizms/models";
import { type DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import {
  contestConverter,
  parseSnapshot,
  studentConverter,
  submissionConverter,
  userConverter,
  variantConverter,
  venueConverter,
  websiteConverter,
} from "./converters-admin";

function fakeSnapshot(id: string, data: Record<string, any> | undefined) {
  return { id, exists: data !== undefined, data: () => data } as unknown as DocumentSnapshot;
}

const start = new Date("2025-03-30T08:00:00Z");
const end = new Date("2025-03-30T10:00:00Z");

const contestData = {
  name: "Test",
  longName: "Test contest",
  problemIds: ["1", "2"],
  userData: [
    { name: "surname", label: "Cognome", type: "text" },
    { name: "name", label: "Nome", type: "text" },
  ],
  matchingRules: [],
  hasVariants: false,
  hasOffline: false,
  scoreVisibility: "never",
};

describe("parseSnapshot", () => {
  it("uses the snapshot id as `id`", () => {
    const contest = parseSnapshot(contestSchema, fakeSnapshot("my-contest", contestData));
    expect(contest.id).toBe("my-contest");
    expect(contest.languages).toEqual(["it"]);
  });

  it("overrides an `id` field stored inside the document", () => {
    const contest = parseSnapshot(
      contestSchema,
      fakeSnapshot("real-id", { ...contestData, id: "stored-id" }),
    );
    expect(contest.id).toBe("real-id");
  });

  it("converts nested Timestamps to Dates", () => {
    const student = parseSnapshot(
      studentSchema,
      fakeSnapshot("s1", {
        participationWindow: {
          start: Timestamp.fromDate(start),
          end: Timestamp.fromDate(end),
        },
        userData: { name: "Mario", birthDate: Timestamp.fromDate(start) },
        updatedAt: Timestamp.fromMillis(1234),
      }),
    );
    expect(student.participationWindow).toEqual({ start, end });
    expect(student.participationWindow?.start).toBeInstanceOf(Date);
    expect(student.userData?.birthDate).toEqual(start);
    expect(student.updatedAt).toEqual(new Date(1234));
  });

  it("converts Timestamps from another firebase-admin copy", () => {
    // Simulates a Timestamp whose class is not the one imported by the converter.
    class ForeignTimestamp {
      constructor(
        readonly seconds: number,
        readonly nanoseconds: number,
      ) {}
      toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
      }
      valueOf() {
        return "not a number";
      }
    }
    const student = parseSnapshot(
      studentSchema,
      fakeSnapshot("s1", {
        createdAt: new ForeignTimestamp(1, 0),
        updatedAt: new ForeignTimestamp(2, 0),
        participationWindow: { start: new ForeignTimestamp(3, 0), end: new ForeignTimestamp(4, 0) },
      }),
    );
    expect(student.createdAt).toEqual(new Date(1000));
    expect(student.updatedAt).toEqual(new Date(2000));
    expect(student.participationWindow).toEqual({ start: new Date(3000), end: new Date(4000) });
  });

  it("does not modify the snapshot data", () => {
    const data = { updatedAt: Timestamp.fromDate(start) };
    parseSnapshot(studentSchema, fakeSnapshot("s1", data));
    expect(data.updatedAt).toBeInstanceOf(Timestamp);
  });

  it("works with a missing document", () => {
    expect(parseSnapshot(studentSchema, fakeSnapshot("s1", undefined))).toEqual({ id: "s1" });
  });

  it("throws on invalid data", () => {
    expect(() => parseSnapshot(studentSchema, fakeSnapshot("s1", { absent: "no" }))).toThrowError(
      /Failed to parse data/,
    );
    expect(() => parseSnapshot(contestSchema, fakeSnapshot("c1", { name: "Test" }))).toThrowError(
      /Failed to parse data/,
    );
  });
});

describe("toFirestore", () => {
  it("removes the id, trims strings and converts Dates to Timestamps", () => {
    const data = venueConverter.toFirestore({
      id: "venue",
      schoolId: "  school ",
      contestId: "contest",
      name: "\tVenue name\n",
      participationWindow: { start, end },
      finalized: false,
      pdfVariants: [" 1 ", "2"],
      disabled: false,
    });
    expect(data).toEqual({
      schoolId: "school",
      contestId: "contest",
      name: "Venue name",
      participationWindow: {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
      },
      finalized: false,
      pdfVariants: ["1", "2"],
      disabled: false,
    });
    expect(data).not.toHaveProperty("id");
  });

  it("keeps non-string and non-date values untouched", () => {
    const data = studentConverter.toFirestore({
      id: "s1",
      absent: false,
      score: 12.5,
      answers: { a: { type: "multipleResponse", value: ["A", "B"] } },
      extraData: { nested: { flag: true, list: [1, 2] } },
    });
    expect(data).toEqual({
      absent: false,
      score: 12.5,
      answers: { a: { type: "multipleResponse", value: ["A", "B"] } },
      extraData: { nested: { flag: true, list: [1, 2] } },
    });
  });

  it("does not modify the input object", () => {
    const input = { id: "s1", token: " tok ", updatedAt: start };
    studentConverter.toFirestore(input);
    expect(input).toEqual({ id: "s1", token: " tok ", updatedAt: start });
  });
});

describe("converters", () => {
  it("round-trips a venue", () => {
    const venue = {
      id: "venue",
      schoolId: "school",
      contestId: "contest",
      name: "Venue",
      token: "abc-def",
      participationWindow: { start, end },
      finalized: true,
      pdfVariants: ["1"],
      disabled: false,
    };
    const stored = venueConverter.toFirestore(venue);
    expect(venueConverter.fromFirestore(fakeSnapshot("venue", stored) as any)).toEqual(venue);
  });

  it("round-trips a contest and applies schema defaults", () => {
    const contest = contestConverter.fromFirestore(fakeSnapshot("c", contestData) as any);
    expect(contest).toMatchObject({ id: "c", onlineSettings: null, allowStudentImport: true });
    const stored = contestConverter.toFirestore(contest);
    expect(contestConverter.fromFirestore(fakeSnapshot("c", stored) as any)).toEqual(contest);
  });

  it("parses users and rejects unknown roles", () => {
    const user = { name: "Scuola", username: "school", password: "pw", role: "teacher" };
    expect(userConverter.fromFirestore(fakeSnapshot("school", user) as any)).toEqual({
      ...user,
      id: "school",
    });
    expect(() =>
      userConverter.fromFirestore(fakeSnapshot("x", { ...user, role: "student" }) as any),
    ).toThrowError(/Failed to parse data/);
  });

  it("parses variants", () => {
    const variant = {
      isOnline: true,
      isPdf: false,
      contestId: "contest",
      schema: {
        "1": {
          type: "openNumber",
          correct: [42],
          pointsCorrect: 5,
          pointsBlank: 1,
          pointsWrong: 0,
          originalId: "1",
        },
      },
    };
    expect(variantConverter.fromFirestore(fakeSnapshot("v1", variant) as any)).toEqual({
      ...variant,
      id: "v1",
    });
  });

  it("parses websites with strict schema", () => {
    const website = { origin: "https://example.com", title: "Example", contests: ["c"] };
    expect(websiteConverter.fromFirestore(fakeSnapshot("w", website) as any)).toEqual({
      ...website,
      id: "w",
    });
    expect(() =>
      websiteConverter.fromFirestore(fakeSnapshot("w", { ...website, extra: 1 }) as any),
    ).toThrowError();
  });

  it("writes submissions", () => {
    const data = submissionConverter.toFirestore({
      id: "sub",
      authType: "unauthenticated",
      studentId: "s1",
      student: { id: "s1", participationWindow: { start, end } },
      submittedAt: "2025-03-30T09:00:00.000Z",
    });
    expect(data).toEqual({
      authType: "unauthenticated",
      studentId: "s1",
      // The top-level id is removed, but the embedded student keeps its own.
      student: {
        id: "s1",
        participationWindow: { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) },
      },
      submittedAt: "2025-03-30T09:00:00.000Z",
    });
  });

  it("parses submissions with an embedded student", () => {
    const submission = {
      authType: "unauthenticated",
      studentId: "s1",
      student: {
        id: "s1",
        participationWindow: { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) },
      },
      submittedAt: "2025-03-30T09:00:00.000Z",
    };
    expect(submissionConverter.fromFirestore(fakeSnapshot("sub", submission) as any)).toEqual({
      id: "sub",
      ...submission,
      student: { id: "s1", participationWindow: { start, end } },
    });
    expect(() =>
      submissionConverter.fromFirestore(
        fakeSnapshot("sub", { ...submission, submittedAt: "yesterday" }) as any,
      ),
    ).toThrowError();
  });
});
