import type { DecodedIdToken } from "firebase-admin/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  studentConverter,
  studentRestoreConverter,
  venueConverter,
} from "~/cli/utils/converters-admin";
import {
  clearFirestore,
  makeContest,
  makeStudent,
  makeStudentRestore,
  makeVariant,
  makeVenue,
  seed,
} from "~/test-utils/emulator";

import { auth, db } from "../common";
import {
  teacherApproveStudentRestore,
  teacherFinalizeVenue,
  teacherImportStudents,
  teacherRejectStudentRestore,
  teacherSetStudentsDisabled,
  teacherStartContestWindow,
  teacherStopContestWindow,
  teacherUpdateStudent,
} from "./teacher";
import { router } from "./trpc";

// Cloud Tasks is not emulated: capture the enqueued tasks instead.
const { enqueue, taskQueue } = vi.hoisted(() => {
  const enqueue = vi.fn();
  const taskQueue = vi.fn(() => ({ enqueue }));
  return { enqueue, taskQueue };
});
vi.mock("firebase-admin/functions", () => ({ getFunctions: () => ({ taskQueue }) }));

const appRouter = router({
  teacherStartContestWindow,
  teacherStopContestWindow,
  teacherFinalizeVenue,
  teacherApproveStudentRestore,
  teacherRejectStudentRestore,
  teacherUpdateStudent,
  teacherSetStudentsDisabled,
  teacherImportStudents,
});
const teacher = appRouter.createCaller({
  claims: { role: "teacher", schoolId: "school" } as unknown as DecodedIdToken,
});
const otherTeacher = appRouter.createCaller({
  claims: { role: "teacher", schoolId: "other-school" } as unknown as DecodedIdToken,
});
const anonymous = appRouter.createCaller({});

const NOW = new Date("2030-05-10T10:00:10Z");
// `NOW` + 3.5 minutes, rounded to the nearest minute.
const EXPECTED_START = new Date("2030-05-10T10:04:00Z");

const onlineSettings = {
  contestWindow: { start: new Date("2030-05-10T08:00:00Z"), end: new Date("2030-05-10T18:00:00Z") },
  duration: 90,
  allowRestart: false,
};

async function getVenue(id = "venue") {
  const snapshot = await db.doc(`venues/${id}`).withConverter(venueConverter).get();
  return snapshot.data();
}

async function getStudentIds(venueId = "venue") {
  const snapshot = await db
    .collection(`venues/${venueId}/students`)
    .withConverter(studentConverter)
    .get();
  return snapshot.docs.map((doc) => doc.id).sort();
}

async function getStudent(venueId = "venue", id = "s1") {
  const snapshot = await db
    .doc(`venues/${venueId}/students/${id}`)
    .withConverter(studentConverter)
    .get();
  return snapshot.data();
}

async function getStudentRestore(id: string) {
  const snapshot = await db
    .doc(`studentRestores/${id}`)
    .withConverter(studentRestoreConverter)
    .get();
  return snapshot.data();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  enqueue.mockReset();
  taskQueue.mockClear();
  await clearFirestore();
  await seed(db, {
    contests: [
      makeContest({ id: "contest", onlineSettings }),
      makeContest({ id: "restart", onlineSettings: { ...onlineSettings, allowRestart: true } }),
      makeContest({ id: "offline", hasOffline: true }),
      makeContest({
        id: "future",
        onlineSettings: {
          ...onlineSettings,
          contestWindow: {
            start: new Date("2030-05-11T08:00:00Z"),
            end: onlineSettings.contestWindow.end,
          },
        },
      }),
      makeContest({
        id: "past",
        onlineSettings: {
          ...onlineSettings,
          contestWindow: {
            start: onlineSettings.contestWindow.start,
            end: new Date("2030-05-10T09:00:00Z"),
          },
        },
      }),
    ],
    venues: [
      makeVenue({ id: "venue" }),
      makeVenue({ id: "other-school-venue", schoolId: "other-school" }),
      makeVenue({ id: "restart-venue", contestId: "restart" }),
      makeVenue({ id: "offline-venue", contestId: "offline" }),
      makeVenue({ id: "future-venue", contestId: "future" }),
      makeVenue({ id: "past-venue", contestId: "past" }),
    ],
    variants: [makeVariant({ id: "v1" })],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe.each([
  [
    "teacherStartContestWindow",
    (c: typeof teacher, venueId: string) => c.teacherStartContestWindow({ venueId }),
  ],
  [
    "teacherStopContestWindow",
    (c: typeof teacher, venueId: string) => c.teacherStopContestWindow({ venueId }),
  ],
  [
    "teacherFinalizeVenue",
    (c: typeof teacher, venueId: string) => c.teacherFinalizeVenue({ venueId }),
  ],
] as const)("%s venue checks", (_, call) => {
  it("rejects a non-existing venue", async () => {
    await expect(call(teacher, "missing")).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Gara non valida" }),
    );
  });

  it("rejects a venue of another school", async () => {
    await expect(call(otherTeacher, "venue")).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non valida" }),
    );
    await expect(call(teacher, "other-school-venue")).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non valida" }),
    );
  });

  it("rejects unauthenticated requests", async () => {
    await expect(call(anonymous, "venue")).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );
  });
});

describe.each([
  [
    "teacherStartContestWindow",
    (venueId: string) => teacher.teacherStartContestWindow({ venueId }),
  ],
  ["teacherStopContestWindow", (venueId: string) => teacher.teacherStopContestWindow({ venueId })],
] as const)("%s online checks", (_, call) => {
  it("rejects contests without online settings", async () => {
    await expect(call("offline-venue")).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Gara non abilitata per prove online",
      }),
    );
  });

  it("rejects contests whose window has not started", async () => {
    await expect(call("future-venue")).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non iniziata" }),
    );
  });

  it("rejects contests whose window has ended", async () => {
    await expect(call("past-venue")).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già terminata" }),
    );
  });
});

describe("teacherStartContestWindow", () => {
  it("starts the participation window", async () => {
    await teacher.teacherStartContestWindow({ venueId: "venue" });

    const venue = await getVenue();
    const expectedEnd = new Date("2030-05-10T11:34:00Z");
    expect(venue).toMatchObject({
      token: expect.stringMatching(/^[a-z]+-[a-z]+-[a-z]+$/),
      participationWindow: { start: EXPECTED_START, end: expectedEnd },
    });

    expect(taskQueue).toHaveBeenCalledWith("locations/europe-west1/functions/updateScores");
    expect(enqueue).toHaveBeenCalledExactlyOnceWith(
      { venueId: "venue", token: venue?.token },
      { scheduleTime: new Date("2030-05-10T11:34:05Z") },
    );
  });

  it("does not fail if the update scores task cannot be queued", async () => {
    enqueue.mockRejectedValue(new Error("Cloud Tasks unavailable"));
    await teacher.teacherStartContestWindow({ venueId: "venue" });
    expect((await getVenue())?.token).toBeDefined();
  });

  it("rejects a venue that is already running", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          token: "old-token",
          participationWindow: {
            start: new Date("2030-05-10T09:30:00Z"),
            end: new Date("2030-05-10T11:00:00Z"),
          },
        }),
      ],
    });
    await expect(teacher.teacherStartContestWindow({ venueId: "venue" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già iniziata" }),
    );
    expect((await getVenue())?.token).toBe("old-token");
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("rejects a restart if the contest does not allow it", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          token: "old-token",
          participationWindow: {
            start: new Date("2030-05-10T08:00:00Z"),
            end: new Date("2030-05-10T09:30:00Z"),
          },
        }),
      ],
    });
    await expect(teacher.teacherStartContestWindow({ venueId: "venue" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già iniziata" }),
    );
  });

  it("rejects a restart while the previous window is running", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "restart-venue",
          contestId: "restart",
          token: "old-token",
          participationWindow: {
            start: new Date("2030-05-10T09:30:00Z"),
            end: new Date("2030-05-10T11:00:00Z"),
          },
        }),
      ],
    });
    await expect(teacher.teacherStartContestWindow({ venueId: "restart-venue" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già iniziata" }),
    );
  });

  it("restarts an ended window if the contest allows it", async () => {
    const revoke = vi.spyOn(auth, "revokeRefreshTokens");
    await seed(db, {
      venues: [
        makeVenue({
          id: "restart-venue",
          contestId: "restart",
          token: "old-token",
          participationWindow: {
            start: new Date("2030-05-10T08:00:00Z"),
            end: new Date("2030-05-10T09:30:00Z"),
          },
        }),
      ],
      students: [
        makeStudent({ id: "old", venueId: "restart-venue", token: "old-token", uid: "old-uid" }),
        makeStudent({ id: "older", venueId: "restart-venue", token: "older", uid: "older-uid" }),
      ],
    });

    await teacher.teacherStartContestWindow({ venueId: "restart-venue" });

    const venue = await getVenue("restart-venue");
    expect(venue?.token).not.toBe("old-token");
    expect(venue?.participationWindow?.start).toEqual(EXPECTED_START);
    // Students of the previous window are logged out but kept.
    expect(revoke).toHaveBeenCalledExactlyOnceWith("old-uid");
    expect(await getStudentIds("restart-venue")).toEqual(["old", "older"]);
  });
});

describe("teacherStopContestWindow", () => {
  const futureWindow = {
    start: new Date("2030-05-10T10:02:00Z"),
    end: new Date("2030-05-10T11:32:00Z"),
  };

  it("cancels a window that has not started yet", async () => {
    const revoke = vi.spyOn(auth, "revokeRefreshTokens");
    await seed(db, {
      venues: [makeVenue({ id: "venue", token: "token", participationWindow: futureWindow })],
      students: [
        makeStudent({ id: "s1", token: "token", uid: "uid1" }),
        makeStudent({ id: "s2", token: "token", uid: "uid2" }),
        makeStudent({ id: "previous", token: "previous-token", uid: "uid3" }),
      ],
    });

    await teacher.teacherStopContestWindow({ venueId: "venue" });

    const venue = await getVenue();
    expect(venue?.token).toBeUndefined();
    expect(venue?.participationWindow).toBeUndefined();
    expect(await getStudentIds()).toEqual(["previous"]);
    expect(revoke.mock.calls.map(([uid]) => uid).sort()).toEqual(["uid1", "uid2"]);
  });

  it("rejects a venue that has not been started", async () => {
    await expect(teacher.teacherStopContestWindow({ venueId: "venue" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non iniziata" }),
    );
  });

  it("rejects a window that has already started", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          token: "token",
          participationWindow: { start: new Date("2030-05-10T10:00:00Z"), end: futureWindow.end },
        }),
      ],
      students: [makeStudent({ id: "s1", token: "token" })],
    });
    await expect(teacher.teacherStopContestWindow({ venueId: "venue" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già iniziata" }),
    );
    expect((await getVenue())?.token).toBe("token");
    expect(await getStudentIds()).toEqual(["s1"]);
  });
});

describe("teacherFinalizeVenue", () => {
  it("finalizes the venue", async () => {
    await teacher.teacherFinalizeVenue({ venueId: "venue" });
    expect((await getVenue())?.finalized).toBe(true);
  });

  it("does not require online settings", async () => {
    await teacher.teacherFinalizeVenue({ venueId: "offline-venue" });
    expect((await getVenue("offline-venue"))?.finalized).toBe(true);
  });

  it("does not finalize venues of other schools", async () => {
    await expect(otherTeacher.teacherFinalizeVenue({ venueId: "venue" })).rejects.toThrow();
    expect((await getVenue())?.finalized).toBe(false);
  });
});

describe("teacherApproveStudentRestore", () => {
  it("approves a pending restore and updates student uid", async () => {
    const revoke = vi.spyOn(auth, "revokeRefreshTokens");
    await seed(db, {
      students: [makeStudent({ id: "s1", venueId: "venue", uid: "old-uid" })],
      studentRestores: [
        makeStudentRestore({
          id: "restore-1",
          studentId: "s1",
          venueId: "venue",
          status: "pending",
        }),
        makeStudentRestore({
          id: "restore-2",
          studentId: "s1",
          venueId: "venue",
          status: "pending",
        }),
      ],
    });

    await teacher.teacherApproveStudentRestore({
      venueId: "venue",
      studentRestoreId: "restore-1",
    });

    expect(revoke).toHaveBeenCalledWith("old-uid");
    const student = await getStudent("venue", "s1");
    expect(student?.uid).toBe("restore-1");
    expect(await getStudentRestore("restore-1")).toBeUndefined();
    expect((await getStudentRestore("restore-2"))?.status).toBe("revoked");
  });

  it("rejects a non-existing restore", async () => {
    await expect(
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "missing" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND", message: "Richiesta non trovata" }),
    );
  });

  it("rejects a restore for another venue", async () => {
    await seed(db, {
      studentRestores: [
        makeStudentRestore({ id: "r-other", venueId: "other-school-venue", status: "pending" }),
      ],
    });
    await expect(
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "r-other" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND", message: "Richiesta non trovata" }),
    );
  });

  it("rejects a restore that is not pending", async () => {
    await seed(db, {
      studentRestores: [
        makeStudentRestore({ id: "r-revoked", venueId: "venue", status: "revoked" }),
      ],
    });
    await expect(
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "r-revoked" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Richiesta non più valida" }),
    );
  });

  it("rejects a restore if student does not exist", async () => {
    await seed(db, {
      studentRestores: [
        makeStudentRestore({
          id: "r-nostudent",
          studentId: "missing-student",
          venueId: "venue",
          status: "pending",
        }),
      ],
    });
    await expect(
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "r-nostudent" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND", message: "Studente non trovato" }),
    );
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      otherTeacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "r1" }),
    ).rejects.toThrow();
    await expect(
      anonymous.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "r1" }),
    ).rejects.toThrow();
  });
});

describe("teacherRejectStudentRestore", () => {
  it("revokes all pending restores for the student", async () => {
    await seed(db, {
      studentRestores: [
        makeStudentRestore({ id: "r1", studentId: "s1", venueId: "venue", status: "pending" }),
        makeStudentRestore({ id: "r2", studentId: "s1", venueId: "venue", status: "pending" }),
        makeStudentRestore({ id: "r3", studentId: "s1", venueId: "venue", status: "approved" }),
      ],
    });

    await teacher.teacherRejectStudentRestore({ venueId: "venue", studentId: "s1" });

    expect((await getStudentRestore("r1"))?.status).toBe("revoked");
    expect((await getStudentRestore("r2"))?.status).toBe("revoked");
    expect((await getStudentRestore("r3"))?.status).toBe("approved");
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      otherTeacher.teacherRejectStudentRestore({ venueId: "venue", studentId: "s1" }),
    ).rejects.toThrow();
    await expect(
      anonymous.teacherRejectStudentRestore({ venueId: "venue", studentId: "s1" }),
    ).rejects.toThrow();
  });
});

describe("teacherUpdateStudent", () => {
  it("updates an existing student and recalculates score", async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "s1",
          venueId: "venue",
          variantId: "v1",
          answers: { "1": { type: "openNumber", value: 10 } },
        }),
      ],
    });

    const res = await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: {
        id: "s1",
        userData: { name: "Luigi", surname: "Rossi" },
        answers: { "1": { type: "openNumber", value: 42 } },
      },
    });

    // In variant v1, question 1 with value 42 gives 5 points.
    expect(res).toEqual({ id: "s1", score: 5 });
    const student = await getStudent("venue", "s1");
    expect(student?.userData).toEqual({ name: "Luigi", surname: "Rossi" });
    expect(student?.score).toBe(5);
    expect(student?.answers).toEqual({ "1": { type: "openNumber", value: 42 } });
  });

  it("clears score when student is marked absent", async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "s1",
          venueId: "venue",
          variantId: "v1",
          answers: { "1": { type: "openNumber", value: 42 } },
          score: 5,
        }),
      ],
    });

    const res = await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { id: "s1", absent: true },
    });

    expect(res).toEqual({ id: "s1", score: undefined });
    const student = await getStudent("venue", "s1");
    expect(student?.absent).toBe(true);
    expect(student?.score).toBeUndefined();
  });

  it("clears score and revokes token when student is disabled", async () => {
    const revoke = vi.spyOn(auth, "revokeRefreshTokens");
    await seed(db, {
      students: [
        makeStudent({
          id: "s1",
          venueId: "venue",
          uid: "student-uid",
          variantId: "v1",
          score: 5,
        }),
      ],
    });

    const res = await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { id: "s1", disabled: true },
    });

    expect(res).toEqual({ id: "s1", score: undefined });
    expect(revoke).toHaveBeenCalledWith("student-uid");
    const student = await getStudent("venue", "s1");
    expect(student?.disabled).toBe(true);
    expect(student?.score).toBeUndefined();
  });

  it("creates a new student when allowStudentImport is true", async () => {
    const res = await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: {
        id: "new-student",
        userData: { name: "Giuseppe", surname: "Verdi" },
      },
    });

    expect(res).toEqual({ id: "new-student", score: 1 });
    const student = await getStudent("venue", "new-student");
    expect(student).toMatchObject({
      id: "new-student",
      contestId: "contest",
      venueId: "venue",
      userData: { name: "Giuseppe", surname: "Verdi" },
      variantId: "v1",
      score: 1,
      absent: false,
      disabled: false,
    });
  });

  it("rejects creating a new student when allowStudentImport is false", async () => {
    await seed(db, {
      contests: [makeContest({ id: "contest", allowStudentImport: false })],
    });

    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "new-student", userData: { name: "Test", surname: "User" } },
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Aggiunta di studenti non consentita",
      }),
    );
  });

  it("rejects an invalid variantId", async () => {
    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1", variantId: "non-existing" },
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: 'Variante "non-existing" non valida',
      }),
    );
  });

  it("rejects when the venue is finalized", async () => {
    await seed(db, {
      venues: [makeVenue({ id: "venue", finalized: true })],
    });

    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1", userData: { name: "Test", surname: "User" } },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già finalizzata" }),
    );
  });

  it("rejects when the contest window is running", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          participationWindow: {
            start: new Date("2030-05-10T09:00:00Z"),
            end: new Date("2030-05-10T11:00:00Z"),
          },
        }),
      ],
    });

    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1", userData: { name: "Test", surname: "User" } },
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      }),
    );
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      otherTeacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1" },
      }),
    ).rejects.toThrow();
    await expect(
      anonymous.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1" },
      }),
    ).rejects.toThrow();
  });
});

describe("teacherSetStudentsDisabled", () => {
  it("disables students and removes scores", async () => {
    await seed(db, {
      students: [
        makeStudent({ id: "s1", venueId: "venue", score: 10 }),
        makeStudent({ id: "s2", venueId: "venue", score: 20 }),
      ],
    });

    const res = await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1", "s2"],
      disabled: true,
    });

    expect(res).toEqual({ count: 2 });
    expect((await getStudent("venue", "s1"))?.disabled).toBe(true);
    expect((await getStudent("venue", "s1"))?.score).toBeUndefined();
    expect((await getStudent("venue", "s2"))?.disabled).toBe(true);
    expect((await getStudent("venue", "s2"))?.score).toBeUndefined();
  });

  it("re-enables students", async () => {
    await seed(db, {
      students: [makeStudent({ id: "s1", venueId: "venue", disabled: true })],
    });

    const res = await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1"],
      disabled: false,
    });

    expect(res).toEqual({ count: 1 });
    expect((await getStudent("venue", "s1"))?.disabled).toBe(false);
  });

  it("rejects disabling students when allowStudentDelete is false", async () => {
    await seed(db, {
      contests: [makeContest({ id: "contest", allowStudentDelete: false })],
      students: [makeStudent({ id: "s1", venueId: "venue" })],
    });

    await expect(
      teacher.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1"],
        disabled: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Cancellazione studenti non consentita",
      }),
    );
  });

  it("rejects when venue is finalized", async () => {
    await seed(db, {
      venues: [makeVenue({ id: "venue", finalized: true })],
    });

    await expect(
      teacher.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1"],
        disabled: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già finalizzata" }),
    );
  });

  it("rejects when contest window is running", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          participationWindow: {
            start: new Date("2030-05-10T09:00:00Z"),
            end: new Date("2030-05-10T11:00:00Z"),
          },
        }),
      ],
    });

    await expect(
      teacher.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1"],
        disabled: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      }),
    );
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      otherTeacher.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1"],
        disabled: true,
      }),
    ).rejects.toThrow();
    await expect(
      anonymous.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1"],
        disabled: true,
      }),
    ).rejects.toThrow();
  });
});

describe("teacherImportStudents", () => {
  it("imports students with default variant and calculates scores", async () => {
    const res = await teacher.teacherImportStudents({
      venueId: "venue",
      students: [
        {
          id: "imp-1",
          userData: { name: "Anna", surname: "Bianchi" },
          answers: { "1": { type: "openNumber", value: 42 } },
        },
        {
          userData: { name: "Paolo", surname: "Neri" },
        },
      ],
    });

    expect(res).toEqual({ count: 2 });
    const s1 = await getStudent("venue", "imp-1");
    expect(s1).toMatchObject({
      id: "imp-1",
      contestId: "contest",
      venueId: "venue",
      userData: { name: "Anna", surname: "Bianchi" },
      variantId: "v1",
      score: 5,
      disabled: false,
      absent: false,
    });

    const students = await getStudentIds("venue");
    expect(students).toContain("imp-1");
    expect(students).toHaveLength(2);
  });

  it("rejects when allowStudentImport is false", async () => {
    await seed(db, {
      contests: [makeContest({ id: "contest", allowStudentImport: false })],
    });

    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" } }],
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Importazione studenti non consentita",
      }),
    );
  });

  it("rejects an invalid variantId", async () => {
    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" }, variantId: "bad-variant" }],
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: 'Variante "bad-variant" non valida',
      }),
    );
  });

  it("rejects when venue is finalized", async () => {
    await seed(db, {
      venues: [makeVenue({ id: "venue", finalized: true })],
    });

    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" } }],
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara già finalizzata" }),
    );
  });

  it("rejects when contest window is running", async () => {
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          participationWindow: {
            start: new Date("2030-05-10T09:00:00Z"),
            end: new Date("2030-05-10T11:00:00Z"),
          },
        }),
      ],
    });

    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" } }],
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Gara in corso, modifiche non consentite",
      }),
    );
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      otherTeacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" } }],
      }),
    ).rejects.toThrow();
    await expect(
      anonymous.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { name: "A", surname: "B" } }],
      }),
    ).rejects.toThrow();
  });
});

describe("teacherUpdateStudent permissions", () => {
  const forbidden = (message: string) => expect.objectContaining({ code: "FORBIDDEN", message });

  async function seedContest(flags: Parameters<typeof makeContest>[0]) {
    await seed(db, {
      contests: [makeContest({ ...flags })],
      students: [
        makeStudent({
          id: "s1",
          userData: { name: "Mario", surname: "Rossi" },
          answers: { "1": { type: "openNumber", value: 10 } },
        }),
      ],
    });
  }

  // The table always sends the whole student.
  const fullStudent = {
    id: "s1",
    userData: { name: "Mario", surname: "Rossi" },
    variantId: "v1",
    answers: { "1": { type: "openNumber" as const, value: 10 } },
    absent: false,
    disabled: false,
    extraData: {},
  };

  it("rejects changing user data when allowStudentEdit is false", async () => {
    await seedContest({ id: "contest", allowStudentEdit: false });
    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { ...fullStudent, userData: { name: "Luigi", surname: "Rossi" } },
      }),
    ).rejects.toThrow(forbidden("Modifica dei dati degli studenti non consentita"));
    expect((await getStudent())?.userData).toEqual({ name: "Mario", surname: "Rossi" });
  });

  it("allows changing answers when only allowStudentEdit is false", async () => {
    await seedContest({ id: "contest", allowStudentEdit: false });
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { ...fullStudent, answers: { "1": { type: "openNumber", value: 42 } } },
    });
    expect((await getStudent())?.score).toBe(5);
  });

  it.each([
    ["answers", { answers: { "1": { type: "openNumber" as const, value: 42 } } }],
    ["absent", { absent: true }],
  ])("rejects changing `%s` when allowAnswerEdit is false", async (_, change) => {
    await seedContest({ id: "contest", allowAnswerEdit: false });
    await expect(
      teacher.teacherUpdateStudent({ venueId: "venue", student: { ...fullStudent, ...change } }),
    ).rejects.toThrow(forbidden("Modifica delle risposte non consentita"));
  });

  it("allows changing user data when only allowAnswerEdit is false", async () => {
    await seedContest({ id: "contest", allowAnswerEdit: false });
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { ...fullStudent, userData: { name: "Luigi", surname: "Rossi" } },
    });
    expect((await getStudent())?.userData).toEqual({ name: "Luigi", surname: "Rossi" });
  });

  it("rejects disabling a student when allowStudentDelete is false", async () => {
    await seedContest({ id: "contest", allowStudentDelete: false });
    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { ...fullStudent, disabled: true },
      }),
    ).rejects.toThrow(forbidden("Cancellazione studenti non consentita"));
    expect((await getStudent())?.disabled).toBe(false);
  });

  it("rejects edits before a scheduled window starts", async () => {
    await seedContest({ id: "contest" });
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          participationWindow: {
            start: new Date("2030-05-10T10:04:00Z"),
            end: new Date("2030-05-10T11:34:00Z"),
          },
        }),
      ],
    });
    await expect(
      teacher.teacherUpdateStudent({ venueId: "venue", student: fullStudent }),
    ).rejects.toThrow(forbidden("Gara in corso, modifiche non consentite"));
  });

  it("allows edits after the window ends", async () => {
    await seedContest({ id: "contest" });
    await seed(db, {
      venues: [
        makeVenue({
          id: "venue",
          participationWindow: {
            start: new Date("2030-05-10T08:00:00Z"),
            end: new Date("2030-05-10T09:30:00Z"),
          },
        }),
      ],
    });
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { ...fullStudent, absent: true },
    });
    expect((await getStudent())?.absent).toBe(true);
  });

  it("rejects ids that are not document ids", async () => {
    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue",
        student: { id: "s1/nested/x", userData: { name: "A", surname: "B" } },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    await expect(
      teacher.teacherUpdateStudent({
        venueId: "venue/students/s1",
        student: { id: "s1" },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });
});

describe("userDataHash", () => {
  it("is not added to students created by the teacher", async () => {
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { id: "new", userData: { name: "Anna", surname: "Bianchi" } },
    });
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { id: "new", userData: { name: "Anna", surname: "Verdi" } },
    });
    expect((await getStudent("venue", "new"))?.userDataHash).toBeUndefined();
  });

  it("is not added to imported students", async () => {
    await teacher.teacherImportStudents({
      venueId: "venue",
      students: [{ id: "imp", userData: { name: "Anna", surname: "Bianchi" } }],
    });
    expect((await getStudent("venue", "imp"))?.userDataHash).toBeUndefined();
  });

  it("is kept in sync for students that logged in online", async () => {
    await seed(db, { students: [makeStudent({ id: "s1", userDataHash: "old-hash" })] });
    await teacher.teacherUpdateStudent({
      venueId: "venue",
      student: { id: "s1", userData: { name: "Luigi", surname: "Rossi" } },
    });
    const hash = (await getStudent())?.userDataHash;
    expect(hash).toEqual(expect.any(String));
    expect(hash).not.toBe("old-hash");
  });
});

describe("teacherApproveStudentRestore concurrency", () => {
  it("approves only one of two concurrent requests for the same student", async () => {
    await seed(db, {
      students: [makeStudent({ id: "s1", uid: "old-uid" })],
      studentRestores: [
        makeStudentRestore({ id: "restore-1", studentId: "s1" }),
        makeStudentRestore({ id: "restore-2", studentId: "s1" }),
      ],
    });

    const results = await Promise.allSettled([
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "restore-1" }),
      teacher.teacherApproveStudentRestore({ venueId: "venue", studentRestoreId: "restore-2" }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const uid = (await getStudent())?.uid;
    expect(["restore-1", "restore-2"]).toContain(uid);
    // The approved request is deleted, the other one is revoked.
    const other = uid === "restore-1" ? "restore-2" : "restore-1";
    expect(await getStudentRestore(uid!)).toBeUndefined();
    expect((await getStudentRestore(other))?.status).toBe("revoked");
  });
});

describe("teacherSetStudentsDisabled details", () => {
  beforeEach(async () => {
    await seed(db, {
      students: [
        makeStudent({
          id: "s1",
          uid: "uid-1",
          answers: { "1": { type: "openNumber", value: 42 } },
          score: 5,
        }),
        makeStudent({ id: "s2", uid: "uid-2" }),
      ],
    });
  });

  it("rejects missing students without changing the others", async () => {
    await expect(
      teacher.teacherSetStudentsDisabled({
        venueId: "venue",
        studentIds: ["s1", "missing"],
        disabled: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND", message: "Studenti non trovati: missing" }),
    );
    expect((await getStudent())?.disabled).toBe(false);
  });

  it("revokes the sessions of disabled students", async () => {
    const revoke = vi.spyOn(auth, "revokeRefreshTokens");
    await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1", "s2"],
      disabled: true,
    });
    expect(revoke).toHaveBeenCalledWith("uid-1");
    expect(revoke).toHaveBeenCalledWith("uid-2");
  });

  it("gives re-enabled students their score back", async () => {
    await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1"],
      disabled: true,
    });
    expect((await getStudent())?.score).toBeUndefined();

    await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1"],
      disabled: false,
    });
    expect(await getStudent()).toMatchObject({ disabled: false, score: 5 });
  });

  it("counts duplicated ids once", async () => {
    const res = await teacher.teacherSetStudentsDisabled({
      venueId: "venue",
      studentIds: ["s1", "s1"],
      disabled: true,
    });
    expect(res).toEqual({ count: 1 });
  });
});

describe("teacherImportStudents details", () => {
  it("never overwrites existing students", async () => {
    await seed(db, { students: [makeStudent({ id: "s1", uid: "uid-1", token: "token" })] });
    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [
          { id: "new", userData: { name: "Anna", surname: "Bianchi" } },
          { id: "s1", userData: { name: "Anna", surname: "Verdi" } },
        ],
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "CONFLICT", message: "Studenti già esistenti: s1" }),
    );
    expect(await getStudent()).toMatchObject({ uid: "uid-1", token: "token" });
    expect(await getStudentIds()).toEqual(["s1"]);
  });

  it("rejects duplicated ids", async () => {
    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [
          { id: "dup", userData: { name: "Anna", surname: "Bianchi" } },
          { id: "dup", userData: { name: "Anna", surname: "Verdi" } },
        ],
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    expect(await getStudentIds()).toEqual([]);
  });

  it("rejects answers when allowAnswerEdit is false", async () => {
    await seed(db, { contests: [makeContest({ id: "contest", allowAnswerEdit: false })] });
    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [
          {
            userData: { name: "Anna", surname: "Bianchi" },
            answers: { "1": { type: "openNumber", value: 42 } },
          },
        ],
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Importazione delle risposte non consentita",
      }),
    );

    await teacher.teacherImportStudents({
      venueId: "venue",
      students: [{ userData: { name: "Anna", surname: "Bianchi" } }],
    });
    expect(await getStudentIds()).toHaveLength(1);
  });

  it("rejects rows with a blank name or surname", async () => {
    await expect(
      teacher.teacherImportStudents({
        venueId: "venue",
        students: [{ userData: { surname: "Bianchi" } as any }],
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });
});
