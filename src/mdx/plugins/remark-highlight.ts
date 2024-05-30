import { Parser } from "acorn";
import clsx from "clsx";
import { Directive } from "estree";
import { Code, InlineCode, Root } from "mdast";
import { MdxJsxFlowElement } from "mdast-util-mdx";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { jsxAttribute } from "./utils";

const remarkHighlight: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, ["code", "inlineCode"], (node, index, parent) => {
      const code = node as Code | InlineCode;
      let lang = code.type === "code" && (code.lang || "text");

      lang ||= /[(+[{]/.test(code.value) ? "srs" : "text"; // guess language

      const value =
        lang === "srs"
          ? code.value
              .replaceAll("{", "${")
              .replaceAll("<-", "←")
              .replaceAll("->", "→")
              .replaceAll("<=", "≤")
              .replaceAll(">=", "≥")
              .replaceAll("!=", "≠")
              .replaceAll("*", "×")
              .replaceAll("...", "…")
          : code.value;

      const templateLiteral = `String.raw\`${value}\``;
      const template = Parser.parse(templateLiteral, {
        ecmaVersion: "latest",
        sourceType: "module",
      });

      parent!.children[index!] = {
        type: "mdxJsxFlowElement",
        name: "Code",
        attributes: [
          jsxAttribute("code", (template.body[0] as Directive).expression),
          jsxAttribute("inline", code.type === "inlineCode"),
          jsxAttribute("lang", lang),
          jsxAttribute(
            "className",
            clsx(
              "not-prose p-0 text-sm",
              code.type === "code" &&
                "overflow-hidden rounded-box border border-base-content/40 *:overflow-x-auto *:p-4",
            ),
          ),
        ],
      } as MdxJsxFlowElement;
    });
  };
};

export default remarkHighlight;
