import process from "node:process";

import { Parser } from "acorn";
import type { Directive } from "estree";
import type { Blockquote, List, Paragraph, Parent, Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { jsxAttribute } from "./utils";

const remarkAnswers: Plugin<[], Root> = () => {
  return (tree: Root) => {
    parseMultipleAnswerGroup(tree);
    parseOpenAnswerGroup(tree);
    parseExplanation(tree);
  };
};

export default remarkAnswers;

function parseMultipleAnswerGroup(tree: Root) {
  visit(tree, { type: "list", ordered: false }, (list: List, index, parent: Parent) => {
    if (!list.children.some((c) => c.checked)) return;

    parent.children[index!] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: list.children.map((child): MdxJsxFlowElement => {
        const attr = jsxAttribute("correct", child.checked);
        return {
          type: "mdxJsxFlowElement",
          name: "Answer",
          attributes: [attr],
          children: child.children,
        } as MdxJsxFlowElement;
      }),
    } as MdxJsxFlowElement;
  });
}

function parseOpenAnswerGroup(tree: Root) {
  visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
    const text = paragraph.children[0];
    if (text?.type !== "text") return;
    if (!text.value.startsWith("?> ")) return;

    text.value = text.value.slice(3);

    let templateLiteral = "String.raw`";
    for (const child of paragraph.children) {
      if (child.type === "text") {
        templateLiteral += child.value;
      } else if (child.type === "mdxTextExpression") {
        templateLiteral += `$\{${child.value}}`;
      } else {
        throw new Error("Open answer solution must be in plain text");
      }
    }
    templateLiteral += "`";

    const template = Parser.parse(templateLiteral, {
      ecmaVersion: "latest",
      sourceType: "module",
    });

    const attributes = [
      jsxAttribute("type", "text"),
      jsxAttribute("correct", (template.body[0] as Directive).expression),
    ];

    parent!.children[index!] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: [
        {
          type: "mdxJsxFlowElement",
          name: "OpenAnswer",
          attributes,
          children: [],
        } as MdxJsxFlowElement,
      ],
    } as MdxJsxFlowElement;
  });
}

function parseExplanation(tree: Root) {
  visit(tree, "blockquote", (blockquote: Blockquote, index, parent) => {
    if (process.env.QUIZMS_MODE === "development" || process.env.QUIZMS_MODE === "training") {
      parent!.children[index!] = {
        type: "mdxJsxFlowElement",
        name: "Explanation",
        attributes: [],
        children: blockquote.children,
      } as MdxJsxFlowElement;
    } else {
      parent!.children.splice(index!, 1);
    }
  });
}
