import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { AsyncPool } from "@olinfo/quizms/utils";
import { stubFalse, stubTrue } from "lodash-es";
import type { PluginContext } from "rollup";

import withCache from "./cache";
import { type AsySrc, compileAsymptote } from "./compile";

export type { AsySrc };

const pool = new AsyncPool(2);

export function transformAsymptote(src: AsySrc) {
  return pool.run(withCache, src.hash, () => compileAsymptote(src));
}

export async function findAsymptoteDependencies(ctx: PluginContext, asyPath: string) {
  const hash = createHash("sha256");

  const deps = new Set<string>();
  const newDeps: string[] = [asyPath];

  while (newDeps.length > 0) {
    const file = newDeps.pop()!;
    if (deps.has(file)) continue;
    deps.add(file);
    ctx.addWatchFile(file);

    if (file !== asyPath) ctx.addWatchFile(file);

    const content = await readFile(file, { encoding: "utf8" });
    hash.update(content);

    const matches = content.matchAll(
      /^(?:access|from|import|include)\s+(?:"([^\n"]+)"|([^\s"]+);)/gm,
    );
    for (const match of matches) {
      const matchPath = match[1] ?? match[2];
      const matchFile = path.format({
        dir: path.join(path.dirname(file), path.dirname(matchPath)),
        name: path.basename(matchPath, ".asy"),
        ext: ".asy",
      });

      const exists = await access(matchFile).then(stubTrue, stubFalse);
      if (exists) newDeps.push(matchFile);
    }
  }

  return hash.digest().toString("hex");
}
