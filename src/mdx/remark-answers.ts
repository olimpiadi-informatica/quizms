import _ from "lodash";
import { Blockquote, List, Paragraph, Parent, Root, Text } from "mdast";
import { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import * as process from "process";
import { Plugin } from "unified";
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
    const radios = list.children.map((child) => {
      const paragraph = child.children[0];
      if (paragraph?.type !== "paragraph") return null;
      const text = paragraph.children[0];
      if (text?.type !== "text" || !/^\((x|\s)\)/.test(text.value)) {
        return null;
      }
      return text;
    });

    function isAnswerGroup(radios: (Text | null)[]): radios is Text[] {
      return !radios.includes(null);
    }

    if (!isAnswerGroup(radios)) return;

    const correct = radios.findIndex((radio) => radio.value.startsWith("(x)"));
    for (const radio of radios) {
      radio.value = radio.value.slice(4);
    }

    parent.children[index!] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: list.children.map((child, index): MdxJsxFlowElement => {
        const attr =
          (process.env.NODE_ENV === "development" || process.env.QUIZMS_MODE === "training") &&
          jsxAttribute("correct", index === correct);

        return {
          type: "mdxJsxFlowElement",
          name: "Answer",
          attributes: _.compact([jsxAttribute("id", String.fromCharCode(65 + index)), attr]),
          children: child.children,
        } as MdxJsxFlowElement;
      }),
    } as MdxJsxFlowElement;
  });
}

function parseOpenAnswerGroup(tree: Root) {
  visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
    const text = paragraph.children[0];
    if (text.type !== "text") return;
    if (!text.value.startsWith("?> ")) return;

    const value = text.value.slice(3);

    const attributes = _.compact([
      jsxAttribute("type", /^\d+$/.test(value) ? "number" : "text"),
      (process.env.NODE_ENV === "development" || process.env.QUIZMS_MODE === "training") &&
        jsxAttribute("correct", value),
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
