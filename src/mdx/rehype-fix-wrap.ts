import { Parent, Root } from "hast";
import { MdxJsxTextElementHast } from "mdast-util-mdx-jsx";
import { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

const rehypeFixWrap: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "mdxJsxTextElement", (math: MdxJsxTextElementHast, index, parent: Parent) => {
      if (math.name !== "Math") return;

      const siblings = parent.children[index + 1];
      if (siblings?.type === "text") {
        const prefix = siblings.value.match(/^(\S+)/)?.[1];
        if (!prefix) return;
        siblings.value = siblings.value.slice(prefix.length);
        parent.children[index] = {
          type: "element",
          tagName: "span",
          properties: {
            className: ["inline-block whitespace-nowrap"],
          },
          children: [
            math,
            {
              type: "text",
              value: prefix,
            },
          ],
        };
        return SKIP;
      }
    });
  };
};

export default rehypeFixWrap;
