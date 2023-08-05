import { join } from "node:path";
import { cwd } from "node:process";

import _ from "lodash";
import { InlineConfig, build } from "vite";

import configs from "./vite/configs";

export type ExportOptions = {
  dir?: string;
  outDir?: string;
  variant?: string;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
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
