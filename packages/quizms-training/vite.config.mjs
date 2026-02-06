import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    lib: {
      entry: {
        entry: "src/entry/index.tsx",
        vite: "src/vite/index.ts",
      },
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
