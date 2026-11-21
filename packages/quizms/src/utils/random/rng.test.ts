import { describe, expect, it } from "vitest";

import { hash } from "~/utils/hash";
import { Rng, randomToken, shuffle } from "~/utils/random";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("hash", () => {
  it("is stable across runs", () => {
    // Seeded randomness (and therefore variant generation) depends on these values.
    expect(hash("")).toMatchInlineSnapshot("8159030233313507");
    expect(hash("quizms")).toMatchInlineSnapshot("6546886038360674");
  });

  it("returns a safe integer", () => {
    for (const input of ["a", "b", "variant-123", "🙂"]) {
      expect(Number.isSafeInteger(hash(input))).toBe(true);
      expect(hash(input)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Rng", () => {
  it("is deterministic for the same seed", () => {
    const a = new Rng("seed");
    const b = new Rng("seed");
    const valuesA = range(20).map(() => a.randInt(0, 1000));
    const valuesB = range(20).map(() => b.randInt(0, 1000));
    expect(valuesA).toEqual(valuesB);
  });

  it("produces different sequences for different seeds", () => {
    const a = new Rng("seed-1");
    const b = new Rng("seed-2");
    expect(range(20).map(() => a.randInt(0, 1000))).not.toEqual(
      range(20).map(() => b.randInt(0, 1000)),
    );
  });

  it("produces a known sequence", () => {
    const rng = new Rng("quizms");
    expect(range(10).map(() => rng.randInt(0, 99))).toMatchInlineSnapshot(`
      [
        9,
        39,
        15,
        68,
        24,
        22,
        22,
        47,
        37,
        83,
      ]
    `);
  });

  it("keeps randInt within the inclusive bounds", () => {
    const rng = new Rng("bounds");
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = rng.randInt(-2, 2);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThanOrEqual(2);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([-1, -2, 0, 1, 2]);
  });

  it("chooses elements from the array", () => {
    const rng = new Rng("choice");
    const array = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(array).toContain(rng.choice(array));
    }
  });

  it("samples k distinct elements", () => {
    const rng = new Rng("sample");
    const array = range(20);
    for (let i = 0; i < 50; i++) {
      const sample = rng.sample(array, 5);
      expect(sample).toHaveLength(5);
      expect(new Set(sample).size).toBe(5);
      for (const value of sample) expect(array).toContain(value);
    }
    expect(array).toEqual(range(20));
  });

  it("samples the whole array when k is at least its length", () => {
    const rng = new Rng("sample");
    expect(rng.sample([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(rng.sample([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });
});

describe("shuffle", () => {
  it("shuffles in place and returns a permutation", () => {
    const array = range(10);
    const result = shuffle(array, "seed");
    expect(result).toBe(array);
    expect([...result].sort((a, b) => a - b)).toEqual(range(10));
  });

  it("is deterministic for the same seed", () => {
    expect(shuffle(range(10), "seed")).toEqual(shuffle(range(10), "seed"));
    expect(shuffle(range(10), "quizms")).toMatchInlineSnapshot(`
      [
        3,
        1,
        8,
        5,
        6,
        4,
        2,
        7,
        0,
        9,
      ]
    `);
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffle([], "seed")).toEqual([]);
    expect(shuffle([1], "seed")).toEqual([1]);
  });
});

describe("randomToken", () => {
  it("returns three words separated by dashes", async () => {
    for (let i = 0; i < 20; i++) {
      expect(await randomToken()).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    }
  });
});
