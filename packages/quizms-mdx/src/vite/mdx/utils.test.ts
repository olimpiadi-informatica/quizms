import { builders as b } from "estree-toolkit";
import { describe, expect, it } from "vitest";

import { jsxAttribute, parseExpressionAt, templateLiteral } from "./utils";

/** The expression of the attribute value. */
const expression = (attribute: ReturnType<typeof jsxAttribute>) => {
  const value = attribute.value;
  if (typeof value !== "object" || value?.type !== "mdxJsxAttributeValueExpression") {
    throw new Error("Expected an expression value");
  }
  const statement = value.data?.estree?.body[0];
  if (statement?.type !== "ExpressionStatement") throw new Error("Expected an expression");
  return statement.expression;
};

describe("jsxAttribute", () => {
  it("creates an expression attribute", () => {
    const attribute = jsxAttribute("name", "value");
    expect(attribute).toMatchObject({
      type: "mdxJsxAttribute",
      name: "name",
      value: { type: "mdxJsxAttributeValueExpression", value: "" },
    });
    expect(attribute.value).toHaveProperty("data.estree.type", "Program");
  });

  it.each([
    ["string", "text"],
    ["number", 42],
    ["boolean", false],
    ["null", null],
  ])("wraps %s values in a literal", (_, value) => {
    expect(expression(jsxAttribute("a", value))).toEqual({ type: "Literal", value });
  });

  it("keeps expressions as they are", () => {
    const value = b.binaryExpression("+", b.identifier("x"), b.literal(1));
    expect(expression(jsxAttribute("a", value))).toBe(value);
  });
});

describe("templateLiteral", () => {
  /** Evaluates the source code of a template literal element. */
  const evaluate = (raw: string): string => new Function(`return \`${raw}\`;`)();

  const texts = ["plain", "a`b", "a\\b", "trailing \\", "${x}", "$", "line\nbreak", ""];
  it.each(texts)("keeps the text %j verbatim", (text) => {
    const literal = templateLiteral([text]);
    expect(literal.expressions).toEqual([]);
    expect(literal.quasis).toHaveLength(1);
    expect(literal.quasis[0]).toMatchObject({ tail: true, value: { cooked: text } });
    expect(evaluate(literal.quasis[0].value.raw)).toBe(text);
  });

  it("alternates text and expressions", () => {
    const x = b.identifier("x");
    const y = b.identifier("y");
    const literal = templateLiteral(["a", "b", x, y, "c"]);
    expect(literal.expressions).toEqual([x, y]);
    expect(literal.quasis.map((q) => [q.value.cooked, q.tail])).toEqual([
      ["ab", false],
      ["", false],
      ["c", true],
    ]);
  });
});

describe("parseExpressionAt", () => {
  it("parses the expression and returns where it ends", () => {
    const [expression, end] = parseExpressionAt("f({a + b}) rest", 3);
    expect(expression).toMatchObject({ type: "BinaryExpression", operator: "+" });
    expect(end).toBe(8);
  });

  it("throws on invalid expressions", () => {
    expect(() => parseExpressionAt("a +")).toThrow();
  });
});
