import { Parser } from "acorn";
import { Program } from "estree";
import { Root, Text } from "hast";
import { MdxTextExpression } from "mdast-util-mdx";
import { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

const rehypeCodeReplacements: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, { type: "element", tagName: "span" }, (span) => {
      const classes = span.properties?.className as string[];
      if (classes?.includes("replacement_")) {
        const code = (span.children[0] as Text).value;

        const templateLiteral = `String.raw\`$${code}\``;
        const template = Parser.parse(templateLiteral, {
          ecmaVersion: "latest",
          sourceType: "module",
        }) as unknown as Program;

        span.children[0] = {
          type: "mdxTextExpression",
          value: templateLiteral,
          data: { estree: template },
        } as MdxTextExpression;

        return SKIP;
      }
    });
  };
};

export default rehypeCodeReplacements;
