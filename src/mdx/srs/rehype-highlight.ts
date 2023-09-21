import { Root, RootContent } from "hast";
import { toText } from "hast-util-to-text";
import { HLJSApi, Language } from "highlight.js";
import { createLowlight } from "lowlight";
import { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

const KEYWORDS = {
  keyword: [
    "variable",
    "function",
    "return",
    "end",
    "if",
    "then",
    "else",
    "for",
    "in",
    "while",
    "do",
  ],
  operator: [
    "<-",
    "+",
    "-",
    "*",
    "/",
    "mod",
    "...",
    "and",
    "or",
    "not",
    "==",
    "!=",
    "<",
    "<=",
    ">",
    ">=",
  ],
  built_in: ["output", "min", "max"],
};

function srs(hljs: HLJSApi): Language {
  return {
    name: "Pseudocode",
    aliases: ["srs"],
    keywords: KEYWORDS,
    contains: [
      hljs.QUOTE_STRING_MODE,
      {
        scope: "number",
        begin: /-?\b\d+\b/,
      },
      {
        scope: "number.replacement",
        begin: /\{.+?}/,
      },
      {
        scope: "type",
        begin: /(integer)(\[])?/,
      },
      {
        scope: "meta.missing",
        begin: /\[\?+]/,
      },
    ],
  };
}

const rehypeHighlight: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const lowlight = createLowlight({ srs });

    visit(tree, { type: "element", tagName: "code" }, (node, index, parent) => {
      // TODO: fix types when update to hast@4
      const text = toText(parent?.type === "element" && parent.tagName === "pre" ? parent : node);
      node.children = lowlight.highlight("srs", text).children as any;
      return SKIP;
    });
  };
};

export default rehypeHighlight;
