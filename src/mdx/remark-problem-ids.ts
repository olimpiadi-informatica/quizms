import { compact } from "lodash-es";
import { Root, TopLevelContent } from "mdast";
import { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import "mdast-util-mdxjs-esm";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { hash } from "~/utils/random";

import { jsxAttribute } from "./utils";

const remarkProblemIds: Plugin<[], Root> = () => {
  return (tree: Root, file) => {
    assignProblemIds(tree);
    parseSubProblems(tree, hash(file.value));
  };
};

export default remarkProblemIds;

function assignProblemIds(tree: Root) {
  let problemIndex = 1;
  visit(tree, { type: "mdxJsxFlowElement", name: "Problem" }, (node: MdxJsxFlowElement) => {
    node.attributes.push(jsxAttribute("index", problemIndex++));
  });
}

function parseSubProblems(tree: Root, problemId: number) {
  let subProblems = 0;
  visit(tree, { type: "mdxJsxFlowElement", name: "AnswerGroup" }, () => {
    subProblems++;
  });
  if (subProblems === 0) return;

  const contents: TopLevelContent[] = [];

  let id = 1;
  for (const child of tree.children as TopLevelContent[]) {
    if (child.type === "mdxjsEsm" || child.type === "thematicBreak" || child.type === "yaml") {
      contents.push(child);
      continue;
    }

    if (contents.at(-1)?.type !== "mdxJsxFlowElement") {
      const attributes = compact([
        jsxAttribute("id", problemId ^ id),
        subProblems > 1 && jsxAttribute("subIndex", id++),
      ]);
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
