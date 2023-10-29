import { Expression, Literal } from "estree";
import { builders as b } from "estree-toolkit";
import { isObject } from "lodash-es";
import { MdxJsxAttribute } from "mdast-util-mdx-jsx";

export function jsxAttribute(name: string, value: Literal["value"] | Expression): MdxJsxAttribute {
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: "",
      data: {
        estree: b.program([
          b.expressionStatement(isObject(value) && "type" in value ? value : b.literal(value)),
        ]),
      },
    },
  };
}
