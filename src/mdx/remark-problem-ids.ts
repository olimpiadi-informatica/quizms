import { Root, TopLevelContent } from "mdast";
import { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import "mdast-util-mdxjs-esm";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

const remarkProblemIds: Plugin<[], Root> = () => {
  return (tree) => {
    assignProblemIds(tree);
    assignSectionIds(tree);
    parseSubProblems(tree);
  };
};

export default remarkProblemIds;

function assignProblemIds(tree: Root) {
  let problemIndex = 1;
  visit(tree, { type: "mdxJsxFlowElement", name: "Problem" }, (node: MdxJsxFlowElement) => {
    node.attributes.push({
      type: "mdxJsxAttribute",
      name: "id",
      value: JSON.stringify(problemIndex++),
    });
  });
}

function assignSectionIds(tree: Root) {
  let sectionIndex = 1;
  visit(tree, { type: "mdxJsxFlowElement", name: "Section" }, (node: MdxJsxFlowElement) => {
    node.attributes.push({
      type: "mdxJsxAttribute",
      name: "id",
      value: JSON.stringify(sectionIndex++),
    });
  });
}

function parseSubProblems(tree: Root) {
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

    if (contents[contents.length - 1]?.type !== "mdxJsxFlowElement") {
      const attributes: MdxJsxAttribute[] =
        subProblems > 1
          ? [{ type: "mdxJsxAttribute", name: "subId", value: JSON.stringify(id++) }]
          : [];
      contents.push({
        type: "mdxJsxFlowElement",
        name: "SubProblem",
        attributes,
        children: [],
      });
    }
    (contents[contents.length - 1] as MdxJsxFlowElement).children.push(child);
  }

  tree.children = contents;
}
