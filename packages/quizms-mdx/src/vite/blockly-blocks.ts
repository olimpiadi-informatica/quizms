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
import type { ZodError, ZodFormattedError, ZodIssue } from "zod";

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
        getDeepError(
          this,
          code,
          [],
          (err as ZodError).format((issue) => issue),
        );
        this.error("Invalid custom blocks.");
      }
    },
  };
}

function getDeepError(
  ctx: TransformPluginContext,
  source: string,
  path: string[],
  errors: ZodFormattedError<any, ZodIssue>,
) {
  for (const key in errors) {
    if (key !== "_errors") {
      getDeepError(ctx, source, [...path, key], (errors as Record<string, any>)[key]);
    }
  }

  const issue = errors._errors[0];
  if (issue) {
    if (issue.message === "Required") {
      issue.message = `Missing field \`${path.at(-1)}\` in object`;
      path.splice(-1);
    }

    const doc = parseDocument(source);
    let node = doc.getIn(path, true) as YAMLNode | undefined;

    if (node && issue.code === "unrecognized_keys") {
      for (const item of (node as YAMLMap<Scalar>).items) {
        if (issue.keys.includes(item.key?.value?.toString() as string)) {
          node = item.key;
          break;
        }
      }
    }

    ctx.error(issue.message, node?.range?.[0]);
  }
}
