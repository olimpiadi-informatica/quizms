import { lingui } from "@lingui/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

export default defineProject({
  plugins: [lingui({ macroTransform: true }), tsconfigPaths()],
  test: {
    name: "quizms-mdx",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
