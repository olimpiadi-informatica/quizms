import path from "node:path";

import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { glob } from "tinyglobby";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

const webEntries = [
  ...(await glob("src/web/*/index.ts")),
  "src/cli/index.ts",
  "src/utils/index.ts",
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
  plugins: [dts({ rollupTypes: true }), nodeExternals(), preserveDirectives(), tsconfigPaths()],
});
