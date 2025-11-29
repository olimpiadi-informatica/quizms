import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    lib: {
      entry: {
        cli: "src/cli/index.ts",
        entry: "src/web/entry/index.tsx",
        functions: "src/functions/index.ts",
        vite: "src/vite/index.ts",
      },
      formats: ["es"],
    },
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      external: /^virtual:/,
      output: {
        preserveModules: true,
        hoistTransitiveImports: false,
      },
    },
  },
  plugins: [dts({ rollupTypes: true }), nodeExternals(), preserveDirectives(), tsconfigPaths()],
});
