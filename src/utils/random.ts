import { sha256 } from "@noble/hashes/sha256";
import { RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";

import { wordlist } from "./wordlist";

export class Rng {
  private readonly rng: RandomGenerator;

  constructor(seed: string) {
    this.rng = xoroshiro128plus(hash(seed));
  }

  public randInt = (min: number, max: number): number => {
    return unsafeUniformIntDistribution(min, max, this.rng);
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

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function randomToken(): string {
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    tokens.push(wordlist[getRandomInt(wordlist.length)]);
  }
  return tokens.join("-");
}

export function randomId() {
  return (
    window?.crypto?.randomUUID?.() ??
    `${getRandomInt(Number.MAX_SAFE_INTEGER)}-${getRandomInt(Number.MAX_SAFE_INTEGER)}`
  );
}
