import { lingui } from "@lingui/vite-plugin";
import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

import blocklyPo from "./scripts/blockly-po-plugin.mjs";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "blockly-editor": "src/blockly-editor/index.tsx",
        "blockly-types": "src/blockly-types/index.ts",
        "components-client": "src/components/client/index.ts",
        "components-schema": "src/components/schema/index.ts",
        "components-server": "src/components/server/index.ts",
        i18n: "src/i18n.ts",
        "jsx-schema": "src/schema/jsx-runtime.ts",
        schema: "src/schema/parse.ts",
        vite: "src/vite/index.ts",
      },
      formats: ["es"],
    },
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      external: /^@olinfo\/quizms\/.*/,
      output: {
        preserveModules: true,
        hoistTransitiveImports: false,
      },
    },
  },
  plugins: [
    // Blockly's messages (`locales/blockly`); fails on untranslated messages.
    blocklyPo({ failOnMissing: true }),
    // Compiles the macros and the `.po` catalogs; fails on untranslated messages.
    lingui({
      macroTransform: true,
      failOnMissing: true,
      failOnCompileError: true,
    }),
    dts({ rollupTypes: true }),
    nodeExternals({ exclude: /\.css$/ }),
    preserveDirectives(),
    tsconfigPaths(),
  ],
});
