import path from "node:path";

import { lingui } from "@lingui/vite-plugin";
import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { glob } from "tinyglobby";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

const webEntries = [
  ...(await glob("src/web/*/index.ts*")),
  "src/cli/index.ts",
  "src/i18n/index.ts",
  "src/models/index.ts",
  "src/utils/index.ts",
  "src/utils-node/index.ts",
];

export default defineConfig({
  build: {
    lib: {
      entry: Object.fromEntries(
        webEntries.map((entry) => [path.basename(path.dirname(entry)), entry]),
      ),
      formats: ["es"],
    },
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      output: {
        preserveModules: true,
        hoistTransitiveImports: false,
      },
    },
  },
  plugins: [
    // Compiles the macros and the `.po` catalogs; fails on untranslated messages.
    lingui({
      macroTransform: {
        macro: {
          // Inside this package, the runtime is imported from the sources.
          runtimeModules: {
            i18n: ["~/i18n", "i18n"],
            Trans: ["~/i18n", "Trans"],
            useLingui: ["~/i18n", "useLingui"],
          },
        },
      },
      failOnMissing: true,
      failOnCompileError: true,
    }),
    dts({ rollupTypes: true }),
    nodeExternals(),
    preserveDirectives(),
    tsconfigPaths(),
  ],
});
