import type { Expression } from "estree";
import type { Code, InlineCode, Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { jsxAttribute, parseExpressionAt, templateLiteral } from "./utils";

const remarkHighlight: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, ["code", "inlineCode"], (node, index, parent) => {
      const code = node as Code | InlineCode;
      let lang = code.type === "code" && (code.lang || "text");

      lang ||= /[(+[{]/.test(code.value) ? "srs" : "text"; // guess language

      // In pseudocode, `{expr}` interpolates a JavaScript expression (e.g. a variant variable).
      const value = lang === "srs" ? pseudocode(code.value) : code.value;

      parent!.children[index!] = {
        type: "mdxJsxFlowElement",
        name: "Code",
        attributes: [
          jsxAttribute("code", value),
          jsxAttribute("inline", code.type === "inlineCode"),
          jsxAttribute("lang", lang),
          jsxAttribute(
            "className",
            code.type === "code"
              ? "overflow-hidden rounded-box border border-base-content/40 text-sm *:overflow-x-auto *:p-4"
              : "p-0 text-base",
          ),
        ],
      } as MdxJsxFlowElement;
    });
  };
};

function pseudocode(code: string) {
  const parts: (string | Expression)[] = [];
  let pos = 0;
  for (let start = code.indexOf("{"); start !== -1; start = code.indexOf("{", pos)) {
    parts.push(replaceOperators(code.slice(pos, start)));
    const [expression, end] = parseExpressionAt(code, start + 1);
    pos = end;
    while (/\s/.test(code[pos])) pos++;
    if (code[pos] !== "}") {
      throw new Error(`Invalid expression in pseudocode: ${code.slice(start, pos + 1)}`);
    }
    pos++;
    parts.push(expression);
  }
  parts.push(replaceOperators(code.slice(pos)));
  return templateLiteral(parts);
}

function replaceOperators(text: string) {
  return text
    .replaceAll("<-", "←")
    .replaceAll("->", "→")
    .replaceAll("<=", "≤")
    .replaceAll(">=", "≥")
    .replaceAll("!=", "≠")
    .replaceAll("*", "×")
    .replaceAll("...", "…");
}

export default remarkHighlight;
