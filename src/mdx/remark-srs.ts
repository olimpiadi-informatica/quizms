import fs from "node:fs";
import { fileURLToPath } from "node:url";

import _ from "lodash";
import { Code, HTML, InlineCode, Parent, Root } from "mdast";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";
import z from "zod";

import { format_code, format_snippet, initSync } from "@/pseudocode-interpreter/sc_int";

initSync(
  fs.readFileSync(
    fileURLToPath(new URL("/src/pseudocode-interpreter/sc_int_bg.wasm", import.meta.url)),
  ),
);

const contextMetadataSchema = z
  .object({
    id: z.string(),
    "inline-code-context": z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) return value;
        const [functionName, placeholderIndex] = value.split(".", 2);
        return { functionName, placeholderIndex };
      })
      .pipe(z.object({ functionName: z.string(), placeholderIndex: z.coerce.number() })),
  })
  .transform((value) => {
    const { "inline-code-context": inlineCodeContext, ...rest } = value;
    return { ...rest, inlineCodeContext };
  });

const inlineContextMetadataSchema = z.object({
  context: z
    .string()
    .transform((value) => {
      const [id, functionName, placeholderIndex] = value.split(".", 3);
      return { id, functionName, placeholderIndex };
    })
    .pipe(
      z.object({
        id: z.string(),
        functionName: z.string(),
        placeholderIndex: z.coerce.number(),
      }),
    ),
});

const metadataSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return value;
    return _.fromPairs(value.split(/\s+/).map((m) => m.split("=", 2)));
  })
  .pipe(z.union([contextMetadataSchema, inlineContextMetadataSchema]));

type MainContext = {
  id: string;
  baseCode: string;
};

type InlineContext = MainContext & {
  functionName: string;
  placeholderIndex: number;
};

type Context = MainContext | InlineContext;

const remarkSrs: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const contexts = parseMainBlockCode(tree);
    parseSecondaryBlockCode(tree, contexts);

    const inlineContext = _.find(contexts, (c): c is InlineContext => "functionName" in c);
    if (inlineContext) parseInlineCode(tree, inlineContext);
  };
};

export default remarkSrs;

function parseMainBlockCode(tree: Root): Record<string, Context> {
  const contexts: Record<string, Context> = {};

  visit(tree, { type: "code", lang: "srs" }, (node: Code, index, parent: Parent) => {
    const meta = metadataSchema.parse(node.meta);

    if ("inlineCodeContext" in meta) {
      node.value += "\n";
      const html = format_code(node.value, 0, true);
      parent.children[index!] = {
        type: "html",
        value: `<code class="block-code">${html}</code>`,
      } as HTML;

      contexts[meta.id] = {
        id: meta.id,
        baseCode: node.value,
        ...meta.inlineCodeContext,
      };
    }
  });

  return contexts;
}

function parseSecondaryBlockCode(tree: Root, contexts: Record<string, Context>): void {
  visit(tree, { type: "code", lang: "srs" }, (node: Code, index, parent: Parent) => {
    const meta = metadataSchema.parse(node.meta);

    if ("context" in meta) {
      const context = contexts[meta.context.id];
      if (!context) throw new Error(`context ${meta.context.id} not found`);

      node.value += "\n";
      const html = format_snippet(
        node.value,
        context.baseCode,
        meta.context.functionName,
        meta.context.placeholderIndex,
        0,
        true,
      );
      parent.children[index!] = {
        type: "html",
        value: `<code class="block-code">${html}</code>`,
      } as HTML;
    }
  });
}

function parseInlineCode(tree: Root, context: InlineContext): void {
  visit(tree, "inlineCode", (node: InlineCode, index, parent: Parent | undefined) => {
    if (!parent) return;
    node.value += "\n";
    const html = format_snippet(
      node.value,
      context.baseCode,
      context.functionName,
      context.placeholderIndex,
      0,
      true,
    );
    parent.children[index!] = {
      type: "html",
      value: `<code class="inline-code">${html}</code>`,
    } as HTML;
  });
}
