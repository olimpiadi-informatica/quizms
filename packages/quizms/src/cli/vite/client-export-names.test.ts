import type { OutputBundle, OutputChunk } from "rollup";
import { describe, expect, it } from "vitest";

import clientExportNames from "./client-export-names";

function chunk(fileName: string, code: string, exports: string[], imports: string[] = []) {
  return { type: "chunk", fileName, code, exports, imports } as unknown as OutputChunk;
}

function run(bundle: Record<string, OutputChunk>) {
  const plugin = clientExportNames() as unknown as {
    generateBundle: (o: unknown, b: OutputBundle) => void;
  };
  plugin.generateBundle({}, bundle as unknown as OutputBundle);
}

describe("clientExportNames", () => {
  it("renames client exports starting with `$` and the imports of the server chunks", () => {
    const client = chunk(
      "chunks/client.js",
      '"use client";function a(){}function b(){}const s="export{x as $}";export{a as $,b as c,a as _$$};',
      ["$", "c", "_$$"],
    );
    const server = chunk(
      "base-statement-demo.js",
      'import{$ as X,c as Y}from"./chunks/client.js";import{$ as Z}from"./other.js";',
      [],
      ["chunks/client.js"],
    );
    run({ client, server });

    expect(client.code).toBe(
      '"use client";function a(){}function b(){}const s="export{x as $}";export{a as _$,b as c,a as _$$};',
    );
    expect(client.exports).toEqual(["_$", "c", "_$$"]);
    expect(server.code).toBe(
      'import{_$ as X,c as Y}from"./chunks/client.js";import{$ as Z}from"./other.js";',
    );
  });

  it("leaves other chunks alone", () => {
    const code = "function a(){}export{a as $};";
    const server = chunk("server.js", code, ["$"]);
    run({ server });
    expect(server.code).toBe(code);
  });
});
