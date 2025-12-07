import path from "node:path";

import { Parser } from "acorn";
import type { Directive } from "estree";
import { builders as b } from "estree-toolkit";
import type { Blockquote, Root } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

import { jsxAttribute } from "./utils";

const remarkAnswers: Plugin<[], Root> = () => {
  return (tree: Root, file) => {
    parseAnswers(tree, file);
    parseExplanation(tree);
  };
};

export default remarkAnswers;

function parseAnswers(tree: Root, file: VFile) {
  const directory = path.basename(file.dirname ?? "");
  let subId = 0;
  visit(tree, "containerDirective", (containerDirective: ContainerDirective, index, parent) => {
    if (containerDirective.name === "answers") {
      const kind = containerDirective.attributes!.class;
      const AnswerComponent = {
        open: "OpenAnswer",
        anyCorrect: "AnyCorrectAnswer",
        allCorrect: "AllCorrectAnswer",
      }[kind!];

      if (kind === "anyCorrect" || kind === "allCorrect") {
        const list = containerDirective.children[0];
        if (list?.type !== "list" || list.ordered) {
          throw new Error("Missing or invalid answers");
        }
        if (kind === "anyCorrect" && !list.children.some((c) => c.checked)) {
          throw new Error("Missing or invalid answers");
        }

        const ids = list.children.map((_, i) => String.fromCharCode(65 + i));

        const groupHash = `${directory}-${subId++}`;

        parent!.children[index!] = {
          type: "mdxJsxFlowElement",
          name: "AnswerGroup",
          attributes: [],
          children: [
            {
              type: "mdxJsxFlowElement",
              name: "MultipleChoiceAnswer",
              attributes: [
                jsxAttribute("kind", kind),
                jsxAttribute("answerIds", b.arrayExpression(ids.map((id) => b.literal(id)))),
                jsxAttribute("groupHash", groupHash),
              ],
              children: list.children.map((child, i): MdxJsxFlowElement => {
                return {
                  type: "mdxJsxFlowElement",
                  name: AnswerComponent,
                  attributes: [
                    jsxAttribute("correct", child.checked),
                    jsxAttribute("originalId", ids[i]),
                  ],
                  children: child.children,
                } as MdxJsxFlowElement;
              }),
            } as MdxJsxFlowElement,
          ],
        } as MdxJsxFlowElement;
      } else {
        const paragraph = containerDirective.children[0];
        if (paragraph.type !== "paragraph") {
          throw new Error("Missing or invalid answers");
        }

        const text = paragraph.children[0];
        if (text?.type !== "text") return;
        if (!text.value.startsWith("?> ")) return;

        text.value = text.value.slice(3);

        let templateLiteral = "String.raw`";
        for (const child of paragraph.children) {
          if (child.type === "text") {
            templateLiteral += child.value;
          } else if (child.type === "mdxTextExpression") {
            templateLiteral += `\${${child.value}}`;
          } else {
            throw new Error("Open answer solution must be in plain text");
          }
        }
        templateLiteral += "`";

        const template = Parser.parse(templateLiteral, {
          ecmaVersion: "latest",
          sourceType: "module",
        });

        const attributes = [jsxAttribute("correct", (template.body[0] as Directive).expression)];

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
      }
    }
  });
}

function parseExplanation(tree: Root) {
  visit(tree, "blockquote", (blockquote: Blockquote, index, parent) => {
    parent!.children[index!] = {
      type: "mdxJsxFlowElement",
      name: "Explanation",
      attributes: [],
      children: blockquote.children,
    } as MdxJsxFlowElement;
  });
}
