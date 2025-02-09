import { readFile } from "node:fs/promises";

import { uniq } from "lodash-es";
import { glob } from "tinyglobby";
import type { PluginOption } from "vite";

type Options = {
  exclude?: string[];
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
  const allDependencies = uniq(packageDependencies.flat());

  return {
    name: "quizms:externals",
    enforce: "pre",
    resolveId(id) {
      if (/^[^a-z@]/.test(id)) return;

      if (match(id, allDependencies) && !match(id, options?.exclude ?? [])) {
        return { id, external: true };
      }
    },
  };
}

function match(id: string, modules: string[]) {
  return modules.some((module) => id === module || id.startsWith(`${module}/`));
}
