import type { RollupOutput } from "rollup";
import nodeExternals from "rollup-plugin-node-externals";
import { build } from "vite";

import type { BaseStatement } from "~/cli/variants/statement";
import directives from "~/cli/vite/directives";

export async function buildBaseClientModules(root: string, baseStatement: BaseStatement) {
  const clientModuleBuild = await build({
    configFile: false,
    root,
    mode: "production",
    build: {
      minify: true,
      rollupOptions: {
        input: baseStatement.clientModule.file,
        output: {
          entryFileNames: "[name].js",
        },
        preserveEntrySignatures: "strict",
        treeshake: {
          moduleSideEffects: false,
        },
      },
    },
    esbuild: {
      legalComments: "none",
    },
    plugins: [directives(), nodeExternals()],
  });

  return (clientModuleBuild as RollupOutput).output[0].fileName;
}
