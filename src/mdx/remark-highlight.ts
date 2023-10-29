import { Parser } from "acorn";
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
      const lang = code.type === "code" ? code.lang ?? "text" : "srs";

      const value =
        lang !== "srs"
          ? code.value
          : code.value
              .replace(/{/g, "${")
              .replace(/<-/g, "←")
              .replace(/->/g, "→")
              .replace(/<=/g, "≤")
              .replace(/>=/g, "≥")
              .replace(/!=/g, "≠")
              .replace(/\*/g, "×")
              .replace(/\.\.\./g, "…");

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
          jsxAttribute("language", lang),
        ],
      } as MdxJsxFlowElement;
    });
  };
};

export default remarkHighlight;
