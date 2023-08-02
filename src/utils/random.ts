import { createHash } from "crypto";
import { RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";

export class Rng {
  private readonly rng: RandomGenerator;

  constructor(seed: string) {
    const hash = createHash("sha256");
    hash.update(seed);
    const digest = hash.digest().readInt32BE();
    this.rng = xoroshiro128plus(digest);
  }

  public randint = (min: number, max: number): number => {
    return unsafeUniformIntDistribution(min, max, this.rng);
  };

  public shuffle = (array: any[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randint(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
  };
}
