import { Code, Parent, Root } from "mdast";
import { createMermaidRenderer } from "mermaid-isomorphic";
import { optimize } from "svgo";
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

    const renderer = createMermaidRenderer();
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
        const { data } = optimize(svg, {
          plugins: [
            "removeDimensions",
            {
              name: "addAttributesToSVGElement",
              params: {
                attribute: { width: `${width}px`, height: `${height}px` },
              },
            },
          ],
        });

        const params = Object.fromEntries(
          (node.meta ?? "")
            .split(/\s+/)
            .map(decodeURIComponent)
            .map((m) => m.split("=", 2)),
        );

        const file = await temporaryWrite(data, { extension: "svg" });
        parent.children[index] = {
          type: "image",
          url: `${file}?${new URLSearchParams(params)}`,
          alt: params.alt,
          title: params.title,
        };
      }),
    );
  };
};

export default remarkMermaid;
