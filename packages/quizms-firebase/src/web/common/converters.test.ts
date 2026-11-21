import { type DocumentSnapshot, Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  announcementConverter,
  contestConverter,
  studentConverter,
  studentRestoreConvert,
  variantConverter,
  venueConverter,
  websiteConverter,
} from "./converters";

function fakeSnapshot(id: string, data: Record<string, any> | undefined) {
  return { id, exists: () => data !== undefined, data: () => data } as unknown as DocumentSnapshot;
}

const start = new Date("2025-03-30T08:00:00Z");
const end = new Date("2025-03-30T10:00:00Z");

describe("web converters", () => {
  it("refuses to write: clients write through the API", () => {
    expect(() =>
      venueConverter.toFirestore({ id: "venue", schoolId: "s", contestId: "c", name: "V" } as any),
    ).toThrow(/read-only/);
  });

  it("converts Timestamps to Dates and uses the snapshot id", () => {
    const venue = venueConverter.fromFirestore(
      fakeSnapshot("venue", {
        id: "ignored",
        schoolId: "school",
        contestId: "contest",
        name: "Venue",
        participationWindow: { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) },
      }) as any,
    );
    expect(venue).toEqual({
      id: "venue",
      schoolId: "school",
      contestId: "contest",
      name: "Venue",
      participationWindow: { start, end },
      finalized: false,
      pdfVariants: [],
      disabled: false,
    });
  });

  it("throws on invalid documents", () => {
    expect(() => contestConverter.fromFirestore(fakeSnapshot("c", { name: 1 }) as any)).toThrow(
      /Failed to parse data/,
    );
    expect(() => variantConverter.fromFirestore(fakeSnapshot("v", {}) as any)).toThrow(
      /Failed to parse data/,
    );
    expect(() =>
      websiteConverter.fromFirestore(fakeSnapshot("w", { origin: "x", title: "y" }) as any),
    ).toThrow(/Failed to parse data/);
  });

  it("reads students", () => {
    const student = studentConverter.fromFirestore(
      fakeSnapshot("s1", {
        participationWindow: { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) },
        createdAt: Timestamp.fromDate(start),
        updatedAt: Timestamp.fromDate(end),
      }) as any,
    );
    expect(student).toEqual({
      id: "s1",
      participationWindow: { start, end },
      createdAt: start,
      updatedAt: end,
    });
  });

  it("reads announcements and student restores", () => {
    expect(
      announcementConverter.fromFirestore(
        fakeSnapshot("a1", {
          createdAt: Timestamp.fromDate(start),
          contestIds: ["c"],
          level: "warning",
          title: "Title",
          body: "Body",
        }) as any,
      ),
    ).toEqual({
      id: "a1",
      createdAt: start,
      contestIds: ["c"],
      level: "warning",
      title: "Title",
      body: "Body",
    });

    const restore = {
      studentId: "s1",
      venueId: "venue",
      token: "token",
      name: "Mario",
      surname: "Rossi",
      approvalCode: 123,
      status: "pending",
    };
    expect(
      studentRestoreConvert.fromFirestore(
        fakeSnapshot("r1", { ...restore, createdAt: Timestamp.fromDate(start) }) as any,
      ),
    ).toEqual({ ...restore, id: "r1", createdAt: start });
    expect(() =>
      studentRestoreConvert.fromFirestore(
        fakeSnapshot("r1", { ...restore, status: "unknown", createdAt: start }) as any,
      ),
    ).toThrow(/Failed to parse data/);
  });
});
