import { compress } from "~/utils/gzip";

export async function encode(plain: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plain);
  return await compress(encoded);
}
