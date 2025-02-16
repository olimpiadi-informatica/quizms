import { readFile } from "node:fs/promises";

import { glob } from "tinyglobby";
import type { PluginOption } from "vite";

type Options = {
  exclude?: RegExp[];
};

export default async function externals(options?: Options): Promise<PluginOption> {
  const manifestPaths = await glob("**/package.json");
  const packageDependencies = await Promise.all(
    manifestPaths.map(async (manifestPath): Promise<string[]> => {
      const manifestContent = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);
      return Object.keys(manifest.dependencies ?? {});
    }),
  );
  const externalDependencies = new Set(
    packageDependencies
      .flat()
      .filter((dep) => options?.exclude?.every((re) => !re.test(dep)) ?? true),
  );

  return {
    name: "quizms:externals",
    enforce: "pre",
    resolveId(id) {
      if (/^[^a-z@]/.test(id)) return;

      const module = id.replace(/^((?:@[^/]+\/)?[^/]+).*/, "$1");
      if (externalDependencies.has(module)) {
        return { id, external: true };
      }
    },
  };
}
