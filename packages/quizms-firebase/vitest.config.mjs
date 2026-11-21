import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

// Date handling depends on the local timezone: pin it to a non-UTC zone (with DST) so that tests
// are reproducible and offset bugs are not hidden.
process.env.TZ = "Europe/Rome";

export default defineProject({
  plugins: [tsconfigPaths()],
  test: {
    name: "quizms-firebase",
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Emulator tests need the Firebase emulators: they run with `pnpm test:emulator`.
    exclude: ["src/**/*.emulator.test.ts"],
  },
});
