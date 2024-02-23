import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import glob from "fast-glob";
import { PluginOption } from "vite";

export default function blocklyMedia(): PluginOption {
  let isLib = false;

  return {
    name: "quizms:blockly-media",
    apply: "build",
    configResolved(config) {
      isLib ||= !!config.build.lib;
    },
    async buildStart() {
      if (isLib) return;

      const mediaDir = join(fileURLToPath(import.meta.resolve("blockly")), "..", "media");
      const files = await readdir(mediaDir);

      await Promise.all(
        files.map(async (file) => {
          const fileName = `blockly/${basename(file)}`;
          this.emitFile({
            fileName,
            type: "asset",
            source: await readFile(join(mediaDir, file)),
          });
        }),
      );
    },
  };
}
