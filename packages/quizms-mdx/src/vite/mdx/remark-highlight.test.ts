import { describe, expect, it } from "vitest";

import remarkHighlight from "./remark-highlight";
import { compileToJsx } from "./test-utils";

const toJsx = (source: string) => compileToJsx(source, { remarkPlugins: [remarkHighlight] });

const blockClassName =
  "overflow-hidden rounded-box border border-base-content/40 text-sm *:overflow-x-auto *:p-4";

describe("remarkHighlight", () => {
  it("converts code blocks", async () => {
    expect(await toJsx("```py\nprint(a[0] * 2)\n```")).toBe(
      `<Code code={"print(a[0] * 2)"} inline={false} lang={"py"} className={${JSON.stringify(blockClassName)}} />`,
    );
  });

  it("converts inline code", async () => {
    expect(await toJsx("Use `plain`.")).toMatchInlineSnapshot(`
      "<p>
        {"Use "}
        <Code code={"plain"} inline={true} lang={"text"} className={"p-0 text-base"} />
        {"."}
      </p>"
    `);
  });

  it("uses plain text for code blocks without a language", async () => {
    expect(await toJsx("```\na <- b[i] * 2\n```")).toContain(
      '<Code code={"a <- b[i] * 2"} inline={false} lang={"text"}',
    );
  });

  const pseudocodeSnippets = ["f(x)", "x + 1", "a[i]", "{x}"];
  it.each(pseudocodeSnippets)("guesses pseudocode for inline code like `%s`", async (code) => {
    expect(await toJsx(`\`${code}\``)).toContain('lang={"srs"}');
  });

  it("replaces operators in pseudocode", async () => {
    expect(await toJsx("`(a <- b -> c <= d >= e != f * g...)`")).toContain(
      "code={`(a ← b → c ≤ d ≥ e ≠ f × g…)`}",
    );
  });

  it("does not replace operators in other languages", async () => {
    expect(await toJsx("```c\na <= b;\n```")).toContain('code={"a <= b;"}');
  });

  it("interpolates variables in pseudocode", async () => {
    expect(await toJsx("`f({n})`")).toContain("code={`f(${n})`}");
  });

  it("keeps backslashes", async () => {
    expect(await toJsx("```tex\n\\frac{1}{2}\n```")).toContain('code={"\\\\frac{1}{2}"}');
  });

  it("supports backticks in code blocks", async () => {
    expect(await toJsx("```sh\necho `date`\n```")).toContain('code={"echo `date`"}');
  });

  it("keeps `${` and trailing backslashes in code blocks", async () => {
    expect(await toJsx("```js\n`${a}` + '\\\\'\n```")).toContain(`code={"\`\${a}\` + '\\\\\\\\'"}`);
    expect(await toJsx("```sh\necho \\\n```")).toContain('code={"echo \\\\"}');
  });

  it("escapes backticks and backslashes in pseudocode", async () => {
    expect(await toJsx("`f(a, \\)`")).toContain("code={`f(a, \\\\)`}");
    expect(await toJsx("``f(`a`)``")).toContain("code={`f(\\`a\\`)`}");
  });

  it("interpolates after a dollar sign in pseudocode", async () => {
    expect(await toJsx("`f(${b})`")).toContain("code={`f($${b})`}");
  });

  it("does not replace operators inside interpolated expressions", async () => {
    expect(await toJsx("`f({a * b}) * 2`")).toContain("code={`f(${a * b}) × 2`}");
  });

  it("rejects invalid expressions in pseudocode", async () => {
    await expect(toJsx("`f({a b})`")).rejects.toThrow("Invalid expression in pseudocode: {a b");
  });
});
