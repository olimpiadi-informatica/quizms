import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

import glob from "fast-glob";
import { PluginOption } from "vite";

export default function blocklyMedia(): PluginOption {
  let isLib = false;
  let root: string;

  return {
    name: "quizms:blockly-media",
    apply: "build",
    configResolved(config) {
      isLib ||= !!config.build.lib;
      root = join(config.root, "..");
    },
    async buildStart() {
      if (isLib) return;

      const files = await glob("**/node_modules/blockly/media/*", { cwd: root });
      await Promise.all(
        files.map(async (file) => {
          const fileName = `blockly/${basename(file)}`;
          this.emitFile({
            fileName,
            type: "asset",
            source: await readFile(join(root, file)),
          });
        }),
      );
    },
  };
}
