import { join } from "node:path";
import { cwd } from "node:process";

import { build } from "vite";

import configs from "./vite/configs";

export type BundleOptions = {
  dir?: string;
  outDir?: string;
  variant?: string;
};

export default async function bundle(options: BundleOptions): Promise<void> {
  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  const variant = options.variant?.padStart(5, "0") ?? "default";

  await build({
    ...configs("production"),
    root: options.dir,
    build: {
      copyPublicDir: false,
      outDir: options.outDir,
      lib: {
        entry: "contest/contest.mdx",
        name: "Contest",
        fileName: `contest-${variant}`,
        formats: ["iife"],
      },
      rollupOptions: {
        external: ["quizms", "react"],
        output: {
          footer: "export default Contest;",
          globals: {
            quizms: "quizms",
            react: "React",
          },
        },
      },
    },
  });
}
