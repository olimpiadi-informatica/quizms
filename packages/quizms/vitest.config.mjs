import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

// Date handling depends on the local timezone: pin it to a non-UTC zone (with DST) so that tests
// are reproducible and offset bugs are not hidden.
process.env.TZ = "Europe/Rome";

export default defineProject({
  plugins: [tsconfigPaths()],
  test: {
    name: "quizms",
    // `.ts` tests run in Node; `.tsx` component tests opt into `happy-dom` with a
    // `// @vitest-environment happy-dom` comment at the top of the file.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/vitest-setup.ts"],
    server: {
      deps: {
        // Imports its own CSS files, which Node cannot load: let Vite process it.
        inline: ["@olinfo/react-components"],
      },
    },
  },
});
