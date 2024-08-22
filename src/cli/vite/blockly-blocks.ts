import type { TransformPluginContext } from "rollup";
import type { PluginOption } from "vite";
import {
  type Scalar,
  type YAMLError,
  type YAMLMap,
  type Node as YAMLNode,
  parse,
  parseDocument,
} from "yaml";
import type { ZodError } from "zod";

import { type CustomBlock, customBlockSchema } from "~/models/blockly-custom-block";

export default function blocklyBlocks(): PluginOption {
  return {
    name: "quizms:blockly-blocks",
    async transform(code, id) {
      const [pathname] = id.split("?");
      if (!pathname.endsWith(".blocks.yaml") && !pathname.endsWith(".blocks.yml")) return;

      let yaml: any;
      try {
        yaml = parse(code, { prettyErrors: false });
      } catch (err) {
        const yamlErr = err as YAMLError;
        this.error(yamlErr.message, yamlErr.pos[0]);
      }

      try {
        const blocks: CustomBlock[] = await customBlockSchema.array().parseAsync(yaml);
        return {
          code: `export default JSON.parse(${JSON.stringify(JSON.stringify(blocks))});`,
          map: { mappings: "" },
        };
      } catch (err) {
        getDeepError(this, code, [], (err as ZodError).format());
        this.error("Invalid custom blocks.");
      }
    },
  };
}

function getDeepError(ctx: TransformPluginContext, source: string, path: string[], errors: any) {
  for (const key in errors) {
    if (key !== "_errors") {
      getDeepError(ctx, source, [...path, key], errors[key]);
    }
  }

  let msg = errors._errors[0];
  if (msg) {
    if (msg === "Required") {
      msg = `Missing field \`${path.at(-1)}\` in object`;
      path.splice(-1);
    }

    const doc = parseDocument(source);
    let node = doc.getIn(path, true) as YAMLNode | undefined;

    if (node && msg.startsWith("Unrecognized key(s) in object: ")) {
      const keys = new Set(msg.match(/'(.*)'$/)?.[1].split("', '"));
      for (const item of (node as YAMLMap<Scalar>).items) {
        if (keys.has(item.key?.value?.toString())) {
          node = item.key;
          break;
        }
      }
    }

    ctx.error(msg, node?.range?.[0]);
  }
}
