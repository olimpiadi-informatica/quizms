import { Blockquote, List, Paragraph, Parent, Root } from "mdast";
import { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import * as process from "process";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

const remarkAnswers: Plugin<[], Root> = () => {
  return (tree) => {
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
    if (radios.some((radio) => radio === null)) return;

    const correct = radios.findIndex((radio) => radio!.value.startsWith("(x)"));
    for (const radio of radios) {
      radio!.value = radio!.value.slice(4);
    }

    parent.children[index] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: list.children.map((child, index): MdxJsxFlowElement => {
        const attr: MdxJsxAttribute | false = process.env.QUIZMS_PUBLIC_SOLUTIONS === "true" && {
          type: "mdxJsxAttribute",
          name: "correct",
          value: JSON.stringify(index === correct),
        };
        return {
          type: "mdxJsxFlowElement",
          name: "Answer",
          attributes: [
            {
              type: "mdxJsxAttribute",
              name: "id",
              value: String.fromCharCode(65 + index),
            },
            ...(attr ? [attr] : []),
          ],
          children: child.children,
        };
      }),
    };
  });
}

function parseOpenAnswerGroup(tree: Root) {
  visit(tree, "paragraph", (paragraph: Paragraph, index, parent: Parent) => {
    const text = paragraph.children[0];
    if (text.type !== "text") return;
    if (!text.value.startsWith("?> ")) return;

    const attr: MdxJsxAttribute | false = process.env.QUIZMS_PUBLIC_SOLUTIONS === "true" && {
      type: "mdxJsxAttribute",
      name: "correct",
      value: text.value.slice(3),
    };

    parent.children[index] = {
      type: "mdxJsxFlowElement",
      name: "AnswerGroup",
      attributes: [],
      children: [
        {
          type: "mdxJsxFlowElement",
          name: "OpenAnswer",
          attributes: [...(attr ? [attr] : [])],
          children: [],
        },
      ],
    };
  });
}

function parseExplanation(tree: Root) {
  visit(tree, "blockquote", (blockquote: Blockquote, index, parent: Parent) => {
    if (process.env.QUIZMS_PUBLIC_SOLUTIONS === "true") {
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Explanation",
        attributes: [],
        children: blockquote.children,
      };
    } else {
      parent.children.splice(index, 1);
    }
  });
}
