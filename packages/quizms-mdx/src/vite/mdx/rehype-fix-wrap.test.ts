import remarkMath from "remark-math";
import remarkMdxMathEnhancedPlugin from "remark-mdx-math-enhanced";
import { describe, expect, it } from "vitest";

import rehypeFixWrap from "./rehype-fix-wrap";
import { compileToJsx } from "./test-utils";

const toJsx = (source: string) =>
  compileToJsx(source, {
    remarkPlugins: [remarkMath, [remarkMdxMathEnhancedPlugin, { component: "Equation" }]],
    rehypePlugins: [rehypeFixWrap],
  });

describe("rehypeFixWrap", () => {
  it("keeps an equation together with the punctuation that follows it", async () => {
    expect(await toJsx("If $x > 0$, then.")).toMatchInlineSnapshot(`
      "<p>
        {"If "}
        <span className="inline-block whitespace-nowrap">
          <Equation>
            {(String.raw)\`x > 0\`}
          </Equation>
          {","}
        </span>
        {" then."}
      </p>"
    `);
  });

  it("only takes the text up to the first whitespace", async () => {
    const jsx = await toJsx("The $n$-th term is here.");
    expect(jsx).toContain('{"-th"}\n  </span>\n  {" term is here."}');
  });

  it("does not wrap equations followed by whitespace", async () => {
    const jsx = await toJsx("Both $x$ and $y$ are here");
    expect(jsx).not.toContain("<span");
  });

  it("does not wrap equations at the end of a paragraph", async () => {
    expect(await toJsx("Value $x$")).not.toContain("<span");
  });

  it("wraps every equation of a paragraph", async () => {
    const jsx = await toJsx("Values $x$, $y$ and $z$.");
    expect(jsx.match(/<span/g)).toHaveLength(2);
  });

  it("ignores other elements", async () => {
    expect(await toJsx("Some <Foo>x</Foo>, text")).not.toContain("<span");
  });
});
