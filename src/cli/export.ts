import { dirname, join } from "node:path";

import glob from "fast-glob";
import { build } from "vite";

import configs from "./vite/configs";

export type ExportOptions = {
  dir: string;
  outDir: string;
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

  const pages = await glob("src/**/index.html", {
    cwd: options.dir,
  });
  const inputs = Object.fromEntries(pages.map((p) => [dirname(p).replace(/\W/g, "-"), p]));

  await build({
    ...configs("production"),
    root: join(options.dir, "src"),
    publicDir: join(options.dir, "public"),
    build: {
      outDir: join(options.dir, options.outDir),
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input: inputs,
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/katex/")) return "katex";
            if (id.includes("node_modules/lodash-es/")) return "lodash";
            if (id.includes("node_modules/react-dom/")) return "react-dom";
            if (
              id.includes("node_modules/highlight.js/") ||
              id.includes("node_modules/lowlight/") ||
              id.includes("node_modules/react-syntax-highlighter/")
            )
              return "highlight";
          },
        },
      },
      sourcemap: options.training,
      chunkSizeWarningLimit: 1000,
    },
    logLevel: "info",
  });
}
