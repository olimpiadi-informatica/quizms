import type { DecodedIdToken } from "firebase-admin/auth";
import { beforeEach, describe, expect, it } from "vitest";

import {
  announcementConverter,
  contestConverter,
  venueConverter,
} from "~/cli/utils/converters-admin";
import { clearFirestore, makeContest, makeVenue, seed } from "~/test-utils/emulator";

import { db } from "../common";
import {
  adminCreateAnnouncement,
  adminSetVenueFinalized,
  adminUpdateContestSettings,
} from "./admin";
import { router } from "./trpc";

const appRouter = router({
  adminUpdateContestSettings,
  adminSetVenueFinalized,
  adminCreateAnnouncement,
});

const admin = appRouter.createCaller({
  claims: { role: "admin" } as unknown as DecodedIdToken,
});
const teacher = appRouter.createCaller({
  claims: { role: "teacher", schoolId: "school" } as unknown as DecodedIdToken,
});
const anonymous = appRouter.createCaller({});

async function getContest(id = "contest") {
  const snapshot = await db.doc(`contests/${id}`).withConverter(contestConverter).get();
  return snapshot.data();
}

async function getVenue(id = "venue") {
  const snapshot = await db.doc(`venues/${id}`).withConverter(venueConverter).get();
  return snapshot.data();
}

async function getAnnouncement(id: string) {
  const snapshot = await db.doc(`announcements/${id}`).withConverter(announcementConverter).get();
  return snapshot.data();
}

beforeEach(async () => {
  await clearFirestore();
  await seed(db, {
    contests: [
      makeContest({
        id: "contest",
        scoreVisibility: "never",
        instructions: "Initial instructions",
      }),
    ],
    venues: [
      makeVenue({ id: "venue", finalized: false }),
      makeVenue({ id: "finalized-venue", finalized: true }),
    ],
  });
});

describe("adminUpdateContestSettings", () => {
  it("updates scoreVisibility and instructions", async () => {
    await admin.adminUpdateContestSettings({
      contestId: "contest",
      settings: {
        scoreVisibility: "always",
        instructions: "New instructions",
      },
    });

    const contest = await getContest("contest");
    expect(contest?.scoreVisibility).toBe("always");
    expect(contest?.instructions).toBe("New instructions");
  });

  it("deletes instructions when null", async () => {
    await admin.adminUpdateContestSettings({
      contestId: "contest",
      settings: {
        scoreVisibility: "finalized",
        instructions: null,
      },
    });

    const contest = await getContest("contest");
    expect(contest?.scoreVisibility).toBe("finalized");
    expect(contest?.instructions).toBeUndefined();
  });

  it("preserves instructions when instructions is undefined", async () => {
    await admin.adminUpdateContestSettings({
      contestId: "contest",
      settings: {
        scoreVisibility: "always",
      },
    });

    const contest = await getContest("contest");
    expect(contest?.scoreVisibility).toBe("always");
    expect(contest?.instructions).toBe("Initial instructions");
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      teacher.adminUpdateContestSettings({
        contestId: "contest",
        settings: { scoreVisibility: "always" },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );

    await expect(
      anonymous.adminUpdateContestSettings({
        contestId: "contest",
        settings: { scoreVisibility: "always" },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );
  });

  it("rejects a non-existing contest", async () => {
    await expect(
      admin.adminUpdateContestSettings({
        contestId: "missing",
        settings: { scoreVisibility: "always" },
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND", message: "Gara non trovata" }));
  });
});

describe("adminSetVenueFinalized", () => {
  it("sets finalized to true", async () => {
    await admin.adminSetVenueFinalized({ venueId: "venue", finalized: true });
    expect((await getVenue("venue"))?.finalized).toBe(true);
  });

  it("sets finalized to false", async () => {
    await admin.adminSetVenueFinalized({ venueId: "finalized-venue", finalized: false });
    expect((await getVenue("finalized-venue"))?.finalized).toBe(false);
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      teacher.adminSetVenueFinalized({ venueId: "venue", finalized: true }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );

    await expect(
      anonymous.adminSetVenueFinalized({ venueId: "venue", finalized: true }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );
  });

  it("rejects a non-existing venue", async () => {
    await expect(
      admin.adminSetVenueFinalized({ venueId: "missing", finalized: true }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND", message: "Sede non trovata" }));
  });
});

describe("adminCreateAnnouncement", () => {
  it("creates an announcement", async () => {
    const res = await admin.adminCreateAnnouncement({
      contestId: "contest",
      level: "info",
      title: "Notice",
      body: "Important announcement",
    });

    expect(res).toEqual({ id: expect.any(String) });
    const announcement = await getAnnouncement(res.id);
    expect(announcement).toMatchObject({
      id: res.id,
      contestIds: ["contest"],
      level: "info",
      title: "Notice",
      body: "Important announcement",
      createdAt: expect.any(Date),
    });
  });

  it("rejects unauthorized callers", async () => {
    await expect(
      teacher.adminCreateAnnouncement({
        contestId: "contest",
        level: "warning",
        title: "Notice",
        body: "Test",
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );

    await expect(
      anonymous.adminCreateAnnouncement({
        contestId: "contest",
        level: "warning",
        title: "Notice",
        body: "Test",
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Non autorizzato" }),
    );
  });

  it("rejects a non-existing contest", async () => {
    await expect(
      admin.adminCreateAnnouncement({
        contestId: "missing",
        level: "error",
        title: "Notice",
        body: "Test",
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND", message: "Gara non trovata" }));
  });
});
