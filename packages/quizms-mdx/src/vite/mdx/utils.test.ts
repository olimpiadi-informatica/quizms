import { builders as b } from "estree-toolkit";
import { describe, expect, it } from "vitest";

import { jsxAttribute } from "./utils";

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
