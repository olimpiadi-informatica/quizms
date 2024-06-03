import { readFile } from "node:fs/promises";

import { load } from "js-yaml";
import { PluginOption } from "vite";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

import { customBlockSchema } from "~/models/blockly-custom-block";

export default function blocklyBlocks(): PluginOption {
  return {
    name: "quizms:blockly-blocks",
    async load(id) {
      const [pathname] = id.split("?");
      if (!pathname.endsWith(".blocks.yaml") && !pathname.endsWith(".blocks.yml")) return;

      const code = await readFile(pathname, "utf8");
      const yaml = load(code, { filename: id });

      try {
        const blocks = await customBlockSchema.array().parseAsync(yaml);
        return {
          code: `export default JSON.parse(${JSON.stringify(JSON.stringify(blocks))});`,
          map: { mappings: "" },
        };
      } catch (err) {
        throw fromZodError(err as ZodError, {
          prefix: "Invalid custom block definition",
        });
      }
    },
  };
}
