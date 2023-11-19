import React, { ComponentType } from "react";

import { chacha20poly1305 } from "@noble/ciphers/chacha";
import { managedNonce } from "@noble/ciphers/webcrypto/utils";

import { Password, Statement } from "~/firebase/types";
import { components } from "~/ui/mdxComponents";
import { decompress } from "~/utils/gzip";

export async function decode(statement: Statement, password: Password): Promise<ComponentType> {
  const cipher = managedNonce(chacha20poly1305)(password);

  const plain = cipher.decrypt(statement);
  const decompressed = await decompress(plain, "text/javascript");

  const url = URL.createObjectURL(decompressed);
  const { default: contest } = await import(/* @vite-ignore */ url);

  return () => contest(React, components);
}
