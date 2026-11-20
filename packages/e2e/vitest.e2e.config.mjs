import { defineConfig } from "vitest/config";

// Not named `vitest.config.mjs` on purpose: the root config runs every
// `packages/*/vitest.config.mjs`, and these tests are slow. Run them with `pnpm test:e2e`.
export default defineConfig({
  test: {
    name: "e2e",
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each file builds the fixture contest: run them one at a time.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 300_000,
    teardownTimeout: 60_000,
  },
});
