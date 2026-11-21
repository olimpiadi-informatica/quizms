import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PluginContext } from "rollup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findAsymptoteDependencies } from "./index";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "quizms-asy-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(file: string, content: string) {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), content);
}

async function dependencies(file: string) {
  const addWatchFile = vi.fn();
  const ctx = { addWatchFile } as unknown as PluginContext;
  const hash = await findAsymptoteDependencies(ctx, path.join(dir, file));
  const watched = new Set(addWatchFile.mock.calls.map(([f]) => path.relative(dir, f)));
  return { hash, watched };
}

describe("findAsymptoteDependencies", () => {
  it("watches the local files imported by an asymptote file", async () => {
    await write(
      "fig.asy",
      [
        "import graph;", // built-in module, not a local file
        'import "lib/utils.asy";',
        "include common;",
        "access missing;",
        "draw((0,0)--(1,1));",
      ].join("\n"),
    );
    await write("lib/utils.asy", 'from "shapes.asy" access square;');
    await write("lib/shapes.asy", "path square;");
    await write("common.asy", "import fig;"); // cycles are allowed

    const { hash, watched } = await dependencies("fig.asy");
    expect(watched).toEqual(new Set(["fig.asy", "lib/utils.asy", "lib/shapes.asy", "common.asy"]));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the hash when a dependency changes", async () => {
    await write("fig.asy", "import dep;\ndraw((0,0)--(1,1));");
    await write("dep.asy", "real x = 1;");
    const before = await dependencies("fig.asy");
    expect((await dependencies("fig.asy")).hash).toBe(before.hash);

    await write("dep.asy", "real x = 2;");
    expect((await dependencies("fig.asy")).hash).not.toBe(before.hash);
  });

  it("ignores imports that are not at the beginning of a line", async () => {
    await write("fig.asy", '// import dep;\nlabel("import dep;");');
    await write("dep.asy", "");
    expect((await dependencies("fig.asy")).watched).toEqual(new Set(["fig.asy"]));
  });

  // BUG: the regex in `index.ts:38` only accepts an unquoted module name directly followed by `;`,
  // so `from shapes access square;` (the usual Asymptote syntax) is not recognised: `shapes.asy`
  // is not watched and changing it does not invalidate the cached SVG. Fix: match the module name
  // with `([^\s";]+)` without requiring the `;` right after it.
  it("watches modules imported with `from ... access`", async () => {
    await write("fig.asy", "from shapes access square;\nunravel shapes;");
    await write("shapes.asy", "path square;");
    expect((await dependencies("fig.asy")).watched).toEqual(new Set(["fig.asy", "shapes.asy"]));
  });
});
