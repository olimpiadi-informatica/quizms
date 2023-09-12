import { join } from "node:path";

import { InlineConfig, build, mergeConfig } from "vite";

import configs from "./vite/configs";
import { runBundle } from "./vite/runBundle";

export type BundleOptions = {
  dir: string;
  outDir: string;
  contest: string;
  variant?: string;
};

export default async function bundle(options: BundleOptions): Promise<void> {
  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  process.env.QUIZMS_MODE = "contest";

  const variant = options.variant?.padStart(5, "0") ?? "default";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const bundleConfig: InlineConfig = {
    root: join(options.dir, "src"),
    build: {
      copyPublicDir: false,
      outDir: options.outDir,
      lib: {
        entry: options.contest,
        fileName: `contest-${variant}`,
        formats: ["es"],
      },
    },
    plugins: [runBundle()],
  };

  await build(mergeConfig(defaultConfig, bundleConfig));
}
