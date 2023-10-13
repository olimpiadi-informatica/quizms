import { sha256 } from "js-sha256";
import { RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";

export class Rng {
  private readonly rng: RandomGenerator;

  constructor(seed: string) {
    this.rng = xoroshiro128plus(hash(seed));
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

export function hash(seed: string): number {
  const digest = sha256.arrayBuffer(seed);
  const view = new DataView(digest);
  return view.getUint32(0);
}
