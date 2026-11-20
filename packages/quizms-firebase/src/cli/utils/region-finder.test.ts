import { describe, expect, it } from "vitest";

import { haversineDistance } from "./region-finder";

const milan = { latitude: 45.4642, longitude: 9.19 };
const rome = { latitude: 41.9028, longitude: 12.4964 };

describe("haversineDistance", () => {
  it("is zero for the same point", () => {
    expect(haversineDistance(milan, milan)).toBe(0);
  });

  it("computes the great-circle distance in meters", () => {
    // Milan - Rome is about 477 km.
    expect(haversineDistance(milan, rome)).toBeCloseTo(477_000, -4);
    // A quarter of the equator.
    expect(
      haversineDistance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 90 }),
    ).toBeCloseTo((Math.PI / 2) * 6371e3, 3);
    // Pole to pole.
    expect(
      haversineDistance({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 }),
    ).toBeCloseTo(Math.PI * 6371e3, 3);
  });

  it("is symmetric and handles the antimeridian", () => {
    expect(haversineDistance(milan, rome)).toBeCloseTo(haversineDistance(rome, milan), 6);
    const a = { latitude: 0, longitude: 179.5 };
    const b = { latitude: 0, longitude: -179.5 };
    // 1 degree of longitude at the equator, not 359.
    expect(haversineDistance(a, b)).toBeCloseTo((Math.PI / 180) * 6371e3, 3);
  });
});
