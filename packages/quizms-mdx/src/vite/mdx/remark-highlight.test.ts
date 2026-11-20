import { describe, expect, it } from "vitest";

import remarkHighlight from "./remark-highlight";
import { compileToJsx } from "./test-utils";

const toJsx = (source: string) => compileToJsx(source, { remarkPlugins: [remarkHighlight] });

const blockClassName =
  "overflow-hidden rounded-box border border-base-content/40 text-sm *:overflow-x-auto *:p-4";

describe("remarkHighlight", () => {
  it("converts code blocks", async () => {
    expect(await toJsx("```py\nprint(a[0] * 2)\n```")).toBe(
      `<Code code={(String.raw)\`print(a[0] * 2)\`} inline={false} lang={"py"} className={${JSON.stringify(blockClassName)}} />`,
    );
  });

  it("converts inline code", async () => {
    expect(await toJsx("Use `plain`.")).toMatchInlineSnapshot(`
      "<p>
        {"Use "}
        <Code code={(String.raw)\`plain\`} inline={true} lang={"text"} className={"p-0 text-base"} />
        {"."}
      </p>"
    `);
  });

  it("uses plain text for code blocks without a language", async () => {
    expect(await toJsx("```\na <- b[i] * 2\n```")).toContain(
      '<Code code={(String.raw)`a <- b[i] * 2`} inline={false} lang={"text"}',
    );
  });

  const pseudocodeSnippets = ["f(x)", "x + 1", "a[i]", "{x}"];
  it.each(pseudocodeSnippets)("guesses pseudocode for inline code like `%s`", async (code) => {
    expect(await toJsx(`\`${code}\``)).toContain('lang={"srs"}');
  });

  it("replaces operators in pseudocode", async () => {
    expect(await toJsx("`(a <- b -> c <= d >= e != f * g...)`")).toContain(
      "code={(String.raw)`(a ← b → c ≤ d ≥ e ≠ f × g…)`}",
    );
  });

  it("does not replace operators in other languages", async () => {
    expect(await toJsx("```c\na <= b;\n```")).toContain("code={(String.raw)`a <= b;`}");
  });

  it("interpolates variables in pseudocode", async () => {
    expect(await toJsx("`f({n})`")).toMatch(/code=\{\(String\.raw\)`f\(\$\{n\}\)`\}/);
  });

  it("keeps backslashes", async () => {
    expect(await toJsx("```tex\n\\frac{1}{2}\n```")).toContain("code={(String.raw)`\\frac{1}{2}`}");
  });

  // BUG: the code is embedded as is in a template literal (`remark-highlight.ts:31`), so any
  // backtick in a code block (shell command substitution, JavaScript template literals, Markdown)
  // makes acorn throw a syntax error and the whole statement fails to compile. Likewise, a
  // trailing backslash breaks the literal, and `${...}` in any language is evaluated as
  // JavaScript. Fix: build the `TemplateLiteral` node directly (or use `b.literal(code.value)`
  // for languages other than pseudocode) instead of parsing a string.
  it.fails("supports backticks in code blocks", async () => {
    expect(await toJsx("```sh\necho `date`\n```")).toContain("echo `date`");
  });
});
