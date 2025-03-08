import { type RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";

import { hash } from "~/utils/hash";

export class Rng {
  private readonly rng: RandomGenerator;

  constructor(seed: string) {
    this.rng = xoroshiro128plus(hash(seed));
  }

  public randInt = (min: number, max: number): number => {
    return unsafeUniformIntDistribution(min, max, this.rng);
  };

  public choice = <T>(array: T[]): T => {
    return array[this.randInt(0, array.length - 1)];
  };

  public sample = <T>(array: T[], k: number): T[] => {
    const values = array.slice(0, k);
    for (let i = k; i < array.length; i++) {
      const j = this.randInt(0, i);
      if (j < k) {
        values[j] = array[i];
      }
    }
    return values;
  };

  public shuffle = (array: any[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
  };
}
