import React, { ComponentType } from "react";

import { components } from "~/ui/mdxComponents";
import { decompress } from "~/utils/gzip";

export async function decode(statement: Uint8Array): Promise<ComponentType> {
  const decompressed = await decompress(statement, "text/javascript");

  const url = URL.createObjectURL(decompressed);
  const { default: contest } = await import(/* @vite-ignore */ url);

  return () => contest(React, components);
}
