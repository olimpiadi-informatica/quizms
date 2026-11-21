import { Parser } from "acorn";
import type { Expression, Literal, TemplateElement, TemplateLiteral } from "estree";
import { builders as b } from "estree-toolkit";
import { isObject } from "lodash-es";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";

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

/**
 * Builds a template literal from verbatim text and expressions. The text is escaped, so it can
 * contain any character, including backticks, backslashes and `${`.
 */
export function templateLiteral(parts: (string | Expression)[]): TemplateLiteral {
  const quasis: TemplateElement[] = [];
  const expressions: Expression[] = [];
  let text = "";
  for (const part of parts) {
    if (typeof part === "string") {
      text += part;
    } else {
      quasis.push(templateElement(text, false));
      expressions.push(part);
      text = "";
    }
  }
  quasis.push(templateElement(text, true));
  return { type: "TemplateLiteral", quasis, expressions };
}

function templateElement(text: string, tail: boolean): TemplateElement {
  return {
    type: "TemplateElement",
    tail,
    value: { cooked: text, raw: text.replace(/\\|`|\$\{/g, (match) => `\\${match}`) },
  };
}

/**
 * Parses the JavaScript expression starting at `start` in `source`, returning it with the index
 * of the first character after it.
 */
export function parseExpressionAt(source: string, start = 0): [Expression, number] {
  const expression = Parser.parseExpressionAt(source, start, { ecmaVersion: "latest" });
  return [expression as Expression, expression.end];
}
