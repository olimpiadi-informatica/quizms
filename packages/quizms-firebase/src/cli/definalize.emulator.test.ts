import { beforeEach, describe, expect, it, vi } from "vitest";

import { venueConverter } from "~/cli/utils/converters-admin";
import { db } from "~/functions/common";
import { clearFirestore, makeVenue, seed } from "~/test-utils/emulator";

import { definalizeVenues } from "./definalize";

vi.mock("@olinfo/quizms/utils-node", () => ({ info: vi.fn(), success: vi.fn() }));

async function getFinalized() {
  const snapshot = await db.collection("venues").withConverter(venueConverter).get();
  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data().finalized]));
}

beforeEach(async () => {
  await clearFirestore();
});

describe("definalizeVenues", () => {
  it("definalizes only the finalized venues", async () => {
    await seed(db, {
      venues: [
        makeVenue({ id: "finalized", finalized: true }),
        makeVenue({ id: "open", finalized: false }),
        makeVenue({ id: "also-finalized", schoolId: "other", finalized: true }),
      ],
    });

    expect(await definalizeVenues(db)).toBe(2);
    expect(await getFinalized()).toEqual({
      finalized: false,
      open: false,
      "also-finalized": false,
    });
  });

  it("does nothing when no venue is finalized", async () => {
    await seed(db, { venues: [makeVenue({ id: "open" })] });
    expect(await definalizeVenues(db)).toBe(0);
    expect(await getFinalized()).toEqual({ open: false });
  });

  it("handles more venues than a single batch", async () => {
    await seed(db, {
      venues: Array.from({ length: 501 }, (_, i) =>
        makeVenue({ id: `v${i}`, schoolId: `s${i}`, finalized: true }),
      ),
    });

    expect(await definalizeVenues(db)).toBe(501);
    expect(Object.values(await getFinalized()).every((finalized) => !finalized)).toBe(true);
  });
});
