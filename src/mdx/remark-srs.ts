import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { InlineCode, Code, Parent, Root } from "mdast";

import { initSync, format_code, format_snippet } from "~/src/pseudocode-interpreter/sc_int.js";

initSync(
  fs.readFileSync(
    fileURLToPath(new URL("~/src/pseudocode-interpreter/sc_int_bg.wasm", import.meta.url))
  )
);

type ContextMetadata = {
  id: string;
  "inline-code-context"?: string;
};

type InlineContextMetadata = {
  context: string;
};

type Metadata = ContextMetadata | InlineContextMetadata;

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
  return (tree) => {
    const contexts = parseMainBlockCode(tree);
    parseSecondaryBlockCode(tree, contexts);

    const inlineContext = Object.values(contexts).find(
      (c): c is InlineContext => "functionName" in c
    );
    if (inlineContext) parseInlineCode(tree, inlineContext);
  };
};

export default remarkSrs;

function parseMainBlockCode(tree: Root): Record<string, Context> {
  const contexts: Record<string, Context> = {};

  visit(tree, { type: "code", lang: "srs" }, (node: Code, index, parent: Parent) => {
    const meta: Metadata = Object.fromEntries(
      node.meta?.split(/\s+/).map((m) => m.split("=", 2)) ?? []
    );

    if ("id" in meta) {
      node.value += "\n";
      const html = format_code(node.value, 0, true);
      parent.children[index] = {
        type: "html",
        value: `<code class="block-code">${html}</code>`,
      };

      const [functionName, placeholderIndex] = meta["inline-code-context"]?.split(".") ?? [];
      contexts[meta.id] = {
        id: meta.id,
        baseCode: node.value,
        ...(meta["inline-code-context"] && {
          functionName,
          placeholderIndex: parseInt(placeholderIndex),
        }),
      };
    }
  });

  return contexts;
}

function parseSecondaryBlockCode(tree: Root, contexts: Record<string, Context>): void {
  visit(tree, { type: "code", lang: "srs" }, (node: Code, index, parent: Parent) => {
    const meta: Metadata = Object.fromEntries(
      node.meta?.split(/\s+/).map((m) => m.split("=", 2)) ?? []
    );

    if ("context" in meta) {
      const [id, functionName, placeholderIndex] = meta["context"].split(".");
      const context = contexts[id];

      node.value += "\n";
      const html = format_snippet(
        node.value,
        context.baseCode,
        functionName,
        parseInt(placeholderIndex),
        0,
        true
      );
      parent.children[index] = {
        type: "html",
        value: `<code class="block-code">${html}</code>`,
      };
    }
  });
}

function parseInlineCode(tree: Root, context: InlineContext): void {
  visit(tree, "inlineCode", (node: InlineCode, index, parent: Parent | null) => {
    if (!parent) return;
    node.value += "\n";
    const html = format_snippet(
      node.value,
      context.baseCode,
      context.functionName,
      context.placeholderIndex,
      0,
      true
    );
    parent.children[index!] = {
      type: "html",
      value: `<code class="inline-code">${html}</code>`,
    };
  });
}
