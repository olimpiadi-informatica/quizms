import type { DecodedIdToken } from "firebase-admin/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { studentConverter, venueConverter } from "~/cli/utils/converters-admin";
import {
  clearFirestore,
  makeContest,
  makeStudent,
  makeVariant,
  makeVenue,
  seed,
} from "~/test-utils/emulator";

import { auth, db } from "../common";
import {
  teacherFinalizeVenue,
  teacherStartContestWindow,
  teacherStopContestWindow,
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
      expect.objectContaining({ code: "FORBIDDEN", message: "Gara non valida" }),
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
