import { describe, expect, it } from "vitest";

import { createAsymptoteInject } from "./inject";

describe("createAsymptoteInject", () => {
  it("returns null without a variant", () => {
    expect(createAsymptoteInject(null)).toBeNull();
  });

  it("declares a typed variable for each value", () => {
    expect(createAsymptoteInject({ n: 3, x: 1.5, ok: true, label: 'say "hi"', empty: "" })).toBe(
      [
        "int n = 3;",
        "real x = 1.5;",
        "bool ok = true;",
        'string label = "say \\"hi\\"";',
        'string empty = "";',
      ].join("\n"),
    );
  });

  it("declares arrays, also nested", () => {
    expect(createAsymptoteInject({ xs: [1, 2], grid: [[true], [false, true]] })).toBe(
      ["int[] xs = { 1, 2 };", "bool[][] grid = { { true }, { false, true } };"].join("\n"),
    );
  });

  it("returns an empty string for an empty variant", () => {
    expect(createAsymptoteInject({})).toBe("");
  });

  it.each([
    ["empty arrays", { xs: [] }],
    ["objects", { p: { x: 1 } }],
    ["null values", { x: null }],
  ])("rejects %s", (_, variant) => {
    expect(() => createAsymptoteInject(variant)).toThrow();
  });

  // BUG: the type of an array is taken from its first element only (`inject.ts:36`), so
  // `[1, 2.5]` becomes `int[] xs = { 1, 2.5 };`, which Asymptote rejects. This is easy to hit
  // with variants generated in Python, where `1.0` is serialized as `1.0` but parsed by
  // JavaScript as the integer `1`. Fix: use `real` when any element of the array is not an
  // integer (and reject arrays mixing different types).
  it.fails("declares arrays of reals starting with an integer value", () => {
    expect(createAsymptoteInject({ xs: [1, 2.5] })).toBe("real[] xs = { 1, 2.5 };");
  });
});
