import { join } from "node:path";
import { cwd } from "node:process";

import { build } from "vite";

import configs from "./configs";

export type BundleOptions = {
  dir?: string;
  variant?: string;
};

export default async function bundle(options: BundleOptions): Promise<void> {
  const root = join(cwd(), options?.dir ?? ".");

  if (options?.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  const variant = process.env.QUIZMS_VARIANT?.padStart(5, "0") ?? "default";

  await build({
    ...configs,
    root,
    mode: "production",
    build: {
      lib: {
        entry: "contest/contest.mdx",
        name: "Contest",
        fileName: `contest-${variant}`,
        formats: ["iife"],
      },
      rollupOptions: {
        external: ["quizms", "react"],
      },
    },
  });
}
