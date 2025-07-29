import type { Root, TopLevelContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { jsxAttribute } from "./utils";

const remarkProblemIds: Plugin<[], Root> = () => {
  return (tree: Root) => {
    assignProblemIds(tree);
    parseSubProblems(tree);
  };
};

export default remarkProblemIds;

function assignProblemIds(tree: Root) {
  let problemIndex = 1;
  visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
    if (node.name === "Problem") {
      node.attributes.push(jsxAttribute("id", problemIndex++));
    }
  });
}

function parseSubProblems(tree: Root) {
  let subProblems = 0;
  visit(tree, { type: "mdxJsxFlowElement", name: "AnswerGroup" }, () => void subProblems++);
  visit(tree, { type: "mdxJsxFlowElement", name: "Blockly" }, () => void subProblems++);
  if (subProblems === 0) return;

  const contents: TopLevelContent[] = [];

  let id = 1;
  for (const child of tree.children as TopLevelContent[]) {
    if (child.type === "mdxjsEsm" || child.type === "thematicBreak" || child.type === "yaml") {
      contents.push(child);
      continue;
    }

    if (contents.at(-1)?.type !== "mdxJsxFlowElement") {
      const attributes = subProblems > 1 ? [jsxAttribute("subId", id++)] : [];
      contents.push({
        type: "mdxJsxFlowElement",
        name: "SubProblem",
        attributes,
        children: [],
      } as MdxJsxFlowElement);
    }
    (contents.at(-1)! as MdxJsxFlowElement).children.push(child);
  }

  tree.children = contents;
}
