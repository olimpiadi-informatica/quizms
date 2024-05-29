import { readFile } from "node:fs/promises";

import { load } from "js-yaml";
import { PluginOption } from "vite";
import { fromError } from "zod-validation-error";

import { customBlockSchema } from "~/mdx/components/blockly/custom-block";

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
          code: `const blocks = ${JSON.stringify(blocks)}; export default blocks;`,
          map: { mappings: "" },
        };
      } catch (err) {
        throw fromError(err, {
          prefix: "Invalid custom block definition",
        });
      }
    },
  };
}
