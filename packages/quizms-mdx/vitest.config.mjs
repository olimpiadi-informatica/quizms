import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

export default defineProject({
  plugins: [tsconfigPaths()],
  test: {
    name: "quizms-mdx",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
