import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

process.env.TZ = "Europe/Rome";

// Safety net: never run these tests against a real Firebase project.
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error(
    "Emulator tests must run inside `firebase emulators:exec`: use `pnpm test:emulator`.",
  );
}
process.env.GCLOUD_PROJECT = "demo-quizms";
process.env.GOOGLE_CLOUD_PROJECT = "demo-quizms";
process.env.QUIZMS_REGION = "europe-west1";

export default defineProject({
  plugins: [tsconfigPaths()],
  test: {
    name: "quizms-firebase-emulator",
    environment: "node",
    include: ["src/**/*.emulator.test.ts"],
    // All test files share the same emulator instance and clear it between tests.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
