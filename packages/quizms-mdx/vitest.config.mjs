import { lingui } from "@lingui/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

import blocklyPo from "./scripts/blockly-po-plugin.mjs";

export default defineProject({
  plugins: [blocklyPo(), lingui({ macroTransform: true }), tsconfigPaths()],
  test: {
    name: "quizms-mdx",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
