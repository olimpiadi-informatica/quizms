import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "blockly-editor": "src/blockly-editor/index.tsx",
        "blockly-types": "src/blockly-types/index.ts",
        "components-client": "src/components/client/index.ts",
        "components-server": "src/components/server/index.ts",
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
    dts({ rollupTypes: true }),
    nodeExternals({ exclude: /\.css$/ }),
    preserveDirectives(),
    tsconfigPaths(),
  ],
});
