import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

      const mediaPath = fileURLToPath(new URL("../../node_modules/blockly/media", import.meta.url));
      const files = await readdir(mediaPath, { recursive: true });

      await Promise.all(
        files.map(async (file) => {
          const fileName = `blockly/${file}`;
          this.emitFile({
            fileName,
            type: "asset",
            source: await readFile(join(mediaPath, file)),
          });
        }),
      );
    },
  };
}
