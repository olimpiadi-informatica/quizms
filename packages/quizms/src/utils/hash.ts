import { sha256 } from "@noble/hashes/sha2";

export function hash(input: Parameters<typeof sha256>[0]): number {
  const digest = sha256(input);
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  return Number(view.getBigUint64(0, true) & BigInt(Number.MAX_SAFE_INTEGER));
}
