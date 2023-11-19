import { chacha20poly1305 } from "@noble/ciphers/chacha";
import { managedNonce } from "@noble/ciphers/webcrypto/utils";

import { Password, Statement } from "~/firebase/types/statement";
import { compress } from "~/utils/gzip";

export async function encode(plain: string, key: Password): Promise<Statement> {
  const encoder = new TextEncoder();
  const cipher = managedNonce(chacha20poly1305)(key.slice());

  const encoded = encoder.encode(plain);
  const compressed = await compress(encoded);
  return cipher.encrypt(compressed);
}
