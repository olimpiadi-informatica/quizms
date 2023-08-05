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

  await build({
    ...configs("production"),
    root: options.dir,
    build: {
      outDir: options.outDir,
    },
    logLevel: "info",
  });
}
