import { Expression } from "estree";
import { Literal } from "estree-jsx";
import { builders as b } from "estree-toolkit";
import _ from "lodash";
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
          b.expressionStatement(_.isObject(value) && "type" in value ? value : b.literal(value)),
        ]),
      },
    },
  };
}
