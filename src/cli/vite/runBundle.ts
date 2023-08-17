import { temporaryWriteTask } from "tempy";
import { PluginOption } from "vite";

import { parseContest } from "~/jsx-runtime/parser";

export function runBundle(): PluginOption {
  return {
    name: "run-bundle",
    async renderChunk(code) {
      const { default: entry } = await temporaryWriteTask(code, (file) => import(file), {
        extension: "mjs",
      });

      return parseContest(entry);
    },
  };
}
