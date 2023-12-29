import { sha256 } from "@noble/hashes/sha256";
import { RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";

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

  public shuffle = (array: any[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
  };
}

export function hash(input: Parameters<typeof sha256>[0]): number {
  const digest = sha256(input);
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  return Number(view.getBigUint64(0, true) & BigInt(Number.MAX_SAFE_INTEGER));
}

export async function randomToken(): Promise<string> {
  const { default: wordlist } = await import("./wordlist.txt");
  const words = wordlist.split("\n");

  const rng = new Rng(randomId());
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    tokens.push(rng.choice(words));
  }
  return tokens.join("-");
}

export function randomId() {
  return crypto.randomUUID();
}
