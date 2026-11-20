import remarkFrontmatter from "remark-frontmatter";
import { describe, expect, it } from "vitest";

import remarkProblemIds from "./remark-problem-ids";
import { compileToJsx } from "./test-utils";

const toJsx = (source: string) =>
  compileToJsx(source, { remarkPlugins: [remarkFrontmatter, remarkProblemIds] });

describe("remarkProblemIds", () => {
  describe("contest", () => {
    it("passes to each section the id of its first problem", async () => {
      const jsx = await toJsx(`
<Section>
  <Problem points={[5, 1, 0]}><P1 /></Problem>
  <Problem points={[5, 1, 0]}><P2 /></Problem>
</Section>
<Section>
  <Problem points={[5, 1, 0]}><P3 /></Problem>
</Section>
<Section>
  <Problem points={[5, 1, 0]}><P4 /></Problem>
</Section>
`);
      expect(jsx.match(/<Section[^>]*>/g)).toEqual([
        "<Section firstProblemId={1}>",
        "<Section firstProblemId={3}>",
        "<Section firstProblemId={4}>",
      ]);
    });

    it("counts problems nested in other elements", async () => {
      const jsx = await toJsx(`
<Contest>
  <Section>
    <div><Problem><P1 /></Problem></div>
  </Section>
  <Section>
    <Problem><P2 /></Problem>
  </Section>
</Contest>
`);
      expect(jsx.match(/<Section[^>]*>/g)).toEqual([
        "<Section firstProblemId={1}>",
        "<Section firstProblemId={2}>",
      ]);
    });

    it("allows text inside `<Locale>`", async () => {
      const jsx = await toJsx(`
<Locale lang="en">
## Section 1
</Locale>
<Section><Problem><P1 /></Problem></Section>
`);
      expect(jsx).toContain("<Section firstProblemId={1}>");
    });

    it.each(["Problem", "Section"])("rejects `<%s>` inside `<Locale>`", async (name) => {
      await expect(toJsx(`<Locale lang="en">\n<div><${name} /></div>\n</Locale>`)).rejects.toThrow(
        `\`<${name}>\` cannot be inside \`<Locale>\``,
      );
    });

    it("does not wrap contests in sub-problems", async () => {
      const jsx = await toJsx("# Title\n\n<Section><Problem><P1 /></Problem></Section>");
      expect(jsx).not.toContain("SubProblem");
    });
  });

  describe("problems", () => {
    it("wraps a problem with a single answer in a sub-problem without id", async () => {
      const jsx = await toJsx(`---
title: test
---

import x from "./x.js";

Statement

<AnswerGroup />

Solution
`);
      expect(jsx).toMatchInlineSnapshot(`
        "<SubProblem>
          <p>
            {"Statement"}
          </p>
          <AnswerGroup />
          <p>
            {"Solution"}
          </p>
        </SubProblem>"
      `);
    });

    it("splits sub-problems at thematic breaks", async () => {
      const jsx = await toJsx(`
First

<AnswerGroup />

---

Second

<AnswerGroup />

---

<Blockly />
`);
      expect(jsx).toMatchInlineSnapshot(`
        "<>
          <SubProblem subId={1}>
            <p>
              {"First"}
            </p>
            <AnswerGroup />
          </SubProblem>
          <hr />
          <SubProblem subId={2}>
            <p>
              {"Second"}
            </p>
            <AnswerGroup />
          </SubProblem>
          <hr />
          <SubProblem subId={3}>
            <Blockly />
          </SubProblem>
        </>"
      `);
    });

    it("counts blockly editors as sub-problems", async () => {
      const jsx = await toJsx("Statement\n\n<Blockly />");
      expect(jsx).toMatch(/^<SubProblem>/);
    });

    it("leaves files without answers unchanged", async () => {
      expect(await toJsx("Statement\n\n---\n\nMore")).not.toContain("SubProblem");
    });
  });
});
