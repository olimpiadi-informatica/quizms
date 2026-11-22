import { Timestamp as ClientTimestamp } from "firebase/firestore";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { convertFromFirestore, isTimestamp } from "./firestore";

/** A Timestamp whose class is not the one imported by the converters. */
class ForeignTimestamp {
  constructor(
    readonly seconds: number,
    readonly nanoseconds: number,
  ) {}
  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
  }
}

describe("isTimestamp", () => {
  it("recognizes Timestamps from any SDK copy", () => {
    expect(isTimestamp(AdminTimestamp.fromMillis(1000))).toBe(true);
    expect(isTimestamp(ClientTimestamp.fromMillis(1000))).toBe(true);
    expect(isTimestamp(new ForeignTimestamp(1, 0))).toBe(true);
  });

  it("rejects other values", () => {
    for (const value of [null, undefined, 0, "2025-01-01", new Date(), { seconds: 1 }, [1, 2]]) {
      expect(isTimestamp(value)).toBe(false);
    }
  });
});

describe("convertFromFirestore", () => {
  it("converts nested Timestamps to Dates without modifying the input", () => {
    const data = {
      a: new ForeignTimestamp(1, 0),
      b: { c: [ClientTimestamp.fromMillis(2000)], d: AdminTimestamp.fromMillis(3000) },
      e: "text",
    };
    expect(convertFromFirestore(data)).toEqual({
      a: new Date(1000),
      b: { c: [new Date(2000)], d: new Date(3000) },
      e: "text",
    });
    expect(data.a).toBeInstanceOf(ForeignTimestamp);
  });
});
