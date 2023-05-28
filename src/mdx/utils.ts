import _ from "lodash";
import { MdxJsxAttribute } from "mdast-util-mdx-jsx";

export function jsxAttribute(name: string, value: any): MdxJsxAttribute {
  return {
    type: "mdxJsxAttribute",
    name,
    value: _.isString(value) ? value : JSON.stringify(value),
  };
}
