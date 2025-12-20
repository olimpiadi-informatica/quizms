import { sha256 } from "@noble/hashes/sha2.js";

export function hash(input: string): number {
  const digest = sha256(Buffer.from(input, "utf-8"));
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  return Number(view.getBigUint64(0, true) & BigInt(Number.MAX_SAFE_INTEGER));
}
