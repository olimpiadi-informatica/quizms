import { dirname } from "node:path";

import glob from "fast-glob";
import { build } from "vite";

import configs from "./vite/configs";

export type ExportOptions = {
  dir?: string;
  outDir?: string;
  training?: boolean;
  variant?: string;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  if (options.training) {
    process.env.QUIZMS_MODE = "training";
  } else {
    process.env.QUIZMS_MODE = "contest";
  }

  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  const pages = await glob("*/index.html", {
    cwd: options.dir,
    ignore: ["dist/**"],
  });
  const inputs = Object.fromEntries(pages.map((p) => [dirname(p), p]));

  await build({
    ...configs("production"),
    root: options.dir,
    build: {
      outDir: options.outDir,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input: {
          index: "index.html",
          ...inputs,
        },
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/katex/")) return "katex";
            if (id.includes("node_modules/lodash/")) return "lodash";
          },
        },
      },
      sourcemap: options.training,
      chunkSizeWarningLimit: 1000,
    },
    logLevel: "info",
  });
}
