import { Code, Parent, Root } from "mdast";
import { createMermaidRenderer } from "mermaid-isomorphic";
import { chromium } from "playwright";
import { temporaryWrite } from "tempy";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

const remarkMermaid: Plugin<[], Root> = () => {
  return async (tree: Root) => {
    const diagrams: { node: Code; index: number; parent: Parent }[] = [];
    visit(tree, { type: "code", lang: "mermaid" }, (node: Code, index, parent) => {
      diagrams.push({ node, index: index!, parent: parent! });
    });

    if (diagrams.length === 0) return;

    const renderer = createMermaidRenderer({ browser: chromium as any });
    const results = await renderer(
      diagrams.map(({ node }) => node.value),
      { mermaidConfig: { theme: "forest" } },
    );

    await Promise.all(
      diagrams.map(async ({ node, index, parent }, i) => {
        const res = results[i];
        if (res.status === "rejected") {
          throw new Error(`Mermaid rendering failed: ${res.reason}`);
        }
        const { svg, width, height } = res.value;

        const file = await temporaryWrite(svg, { extension: "svg" });
        parent.children[index] = {
          type: "image",
          url: `${file}?w=${width}&h=${height}`,
          alt: node.meta ?? "",
        };
      }),
    );
  };
};

export default remarkMermaid;
