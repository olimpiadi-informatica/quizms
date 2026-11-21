import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

/** Packages with their own message catalog (`packages/<name>/locales/<locale>.po`). */
const packages = ["quizms", "quizms-mdx", "quizms-firebase", "quizms-training"];

export default defineConfig({
  // Source strings are written in English; keep in sync with `uiLocales` in
  // `packages/quizms/src/i18n/locales.ts`.
  sourceLocale: "en",
  locales: ["en", "it"],
  catalogs: packages.map((pkg) => ({
    path: `<rootDir>/packages/${pkg}/locales/{locale}`,
    include: [`<rootDir>/packages/${pkg}/src`],
    exclude: ["**/*.test.ts", "**/*.test.tsx", "**/test-utils.tsx", "**/vitest-setup.ts"],
  })),
  // No line numbers: they would change the catalogs on every unrelated edit.
  format: formatter({ lineNumbers: false }),
  // All packages share the runtime of `@olinfo/quizms`, so there is a single copy of Lingui.
  // `@olinfo/quizms` itself overrides this with `~/i18n` in its Vite config.
  runtimeConfigModule: {
    i18n: ["@olinfo/quizms/i18n", "i18n"],
    Trans: ["@olinfo/quizms/i18n", "Trans"],
    useLingui: ["@olinfo/quizms/i18n", "useLingui"],
  },
});
