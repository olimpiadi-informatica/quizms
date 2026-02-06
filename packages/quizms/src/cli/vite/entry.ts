import { existsSync } from "node:fs";
import path from "node:path";

import type { PluginOption } from "vite";

import { error } from "~/utils-node";

import { generateHtmlFromBundle } from "./html";

export default function entry(): PluginOption {
  let root = "";

  return {
    name: "quizms:entry",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      const [pathname] = id.split("?");
      if (pathname === "virtual:quizms-entry") {
        return `\0${id}`;
      }
    },
    load(id) {
      const [pathname, query] = id.split("?");
      if (pathname === "\0virtual:quizms-entry") {
        if (!existsSync(path.join(root, "global.css"))) {
          error("Missing global.css file");
        }

        const params = new URLSearchParams(query);
        return `\
import createApp from "${params.get("id")}";
import "@olinfo/quizms/css";
import "~/global.css";

createApp();`;
      }
    },
    async generateBundle(this, _, bundle) {
      const entryChunks = Object.values(bundle)
        .filter((chunk) => "facadeModuleId" in chunk)
        .filter((chunk) => chunk.facadeModuleId?.startsWith("\0virtual:quizms-entry"));

      for (const chunk of entryChunks) {
        this.emitFile({
          type: "asset",
          fileName: `${chunk.name}.html`,
          source: await generateHtmlFromBundle(chunk, bundle),
        });
      }
    },
  };
}
