import { describe, expect, it } from "vitest";

import { parseOpenNumber } from "./open-number";

describe("parseOpenNumber", () => {
  it("parses valid integers and decimals, including negatives and trailing dots", () => {
    expect(parseOpenNumber("0")).toBe(0);
    expect(parseOpenNumber("42")).toBe(42);
    expect(parseOpenNumber("-42")).toBe(-42);
    expect(parseOpenNumber("  -3.5  ")).toBe(-3.5);
    expect(parseOpenNumber("3.")).toBe(3);
    expect(parseOpenNumber(".5")).toBe(0.5);
    expect(parseOpenNumber("-.5")).toBe(-0.5);
  });

  it("rejects letters, intermediate signs, and non-finite or non-decimal values", () => {
    expect(parseOpenNumber("")).toBeUndefined();
    expect(parseOpenNumber("   ")).toBeUndefined();
    expect(parseOpenNumber("a")).toBeUndefined();
    expect(parseOpenNumber("12a")).toBeUndefined();
    expect(parseOpenNumber("-")).toBeUndefined();
    expect(parseOpenNumber(".")).toBeUndefined();
    expect(parseOpenNumber("-.")).toBeUndefined();
    expect(parseOpenNumber("1..2")).toBeUndefined();
    expect(parseOpenNumber("1,5")).toBeUndefined();
    expect(parseOpenNumber("1e5")).toBeUndefined();
    expect(parseOpenNumber("0x10")).toBeUndefined();
    expect(parseOpenNumber("Infinity")).toBeUndefined();
    expect(parseOpenNumber("NaN")).toBeUndefined();
    expect(parseOpenNumber("9".repeat(400))).toBeUndefined();
  });
});
