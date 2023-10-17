import process from "node:process";

import { Parser } from "acorn";
import { Directive, Program } from "estree";
import _ from "lodash";
import { Blockquote, List, Paragraph, Parent, Root } from "mdast";
import { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { Rng, hash } from "~/utils/random";

import { jsxAttribute } from "./utils";

const remarkAnswers: Plugin<[], Root> = () => {
  return (tree: Root, file) => {
    parseMultipleAnswerGroup(tree, hash(file.value));
    parseOpenAnswerGroup(tree);
    parseExplanation(tree);
  };
};

export default remarkAnswers;

function parseMultipleAnswerGroup(tree: Root, problemId: number) {
  visit(tree, { type: "list", ordered: false }, (list: List, index, parent: Parent) => {
    if (!_.some(list.children, "checked")) return;

    if (process.env.QUIZMS_VARIANT) {
      const rng = new Rng(`b#answers#${process.env.QUIZMS_VARIANT}#${problemId}`);
      rng.shuffle(list.children);
    }

    parent.children[index!] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: list.children.map((child): MdxJsxFlowElement => {
        const attr =
          (process.env.NODE_ENV === "development" || process.env.QUIZMS_MODE === "training") &&
          jsxAttribute("correct", child.checked);

        return {
          type: "mdxJsxFlowElement",
          name: "Answer",
          attributes: _.compact([attr]),
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
    }) as unknown as Program;

    const attributes = _.compact([
      jsxAttribute("type", "text"),
      (process.env.NODE_ENV === "development" || process.env.QUIZMS_MODE === "training") &&
        jsxAttribute("correct", (template.body[0] as Directive).expression),
    ]);

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
    if (process.env.NODE_ENV === "development" || process.env.QUIZMS_MODE === "training") {
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
