import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";

import remarkAnswers from "./remark-answers";
import { compileToJsx } from "./test-utils";

const toJsx = (source: string) =>
  compileToJsx(source, { remarkPlugins: [remarkDirective, remarkGfm, remarkAnswers] });

describe("remarkAnswers", () => {
  describe("closed answers", () => {
    it("converts a multiple choice list", async () => {
      const jsx = await toJsx(`
:::answers{.multipleChoice}
- [ ] one
- [x] **two**
:::
`);
      expect(jsx).toMatchInlineSnapshot(`
        "<AnswerGroup>
          <ClosedAnswer type={"multipleChoice"} problemId={"p-1-test-0"}>
            <MultipleChoiceAnswer correct={false}>
              <p>
                {"one"}
              </p>
            </MultipleChoiceAnswer>
            <MultipleChoiceAnswer correct={true}>
              <p>
                <strong>
                  {"two"}
                </strong>
              </p>
            </MultipleChoiceAnswer>
          </ClosedAnswer>
        </AnswerGroup>"
      `);
    });

    it("converts a multiple response list, also without correct options", async () => {
      const jsx = await toJsx(`
:::answers{.multipleResponse}
- [ ] one
- [ ] two
:::
`);
      expect(jsx).toContain('<ClosedAnswer type={"multipleResponse"} problemId={"p-1-test-0"}>');
      expect(jsx.match(/<MultipleResponseAnswer correct=\{false\}>/g)).toHaveLength(2);
    });

    it("numbers the closed answers of a file, skipping open answers", async () => {
      const jsx = await toJsx(`
:::answers{.multipleChoice}
- [x] a
:::

:::answers{.open}
?> 1
:::

:::answers{.multipleResponse}
- [x] b
:::
`);
      expect(jsx.match(/problemId=\{"[^"]*"\}/g)).toEqual([
        'problemId={"p-1-test-0"}',
        'problemId={"p-1-test-1"}',
      ]);
    });

    it("requires a correct option in multiple choice answers", async () => {
      await expect(toJsx(":::answers{.multipleChoice}\n- [ ] a\n- [ ] b\n:::")).rejects.toThrow(
        "Missing or invalid answers",
      );
    });

    it.each([
      ["an ordered list", ":::answers{.multipleChoice}\n1. [x] a\n:::"],
      ["a paragraph", ":::answers{.multipleResponse}\nanswer\n:::"],
      ["no content", ":::answers{.multipleChoice}\n:::"],
    ])("rejects %s", async (_, source) => {
      await expect(toJsx(source)).rejects.toThrow("Missing or invalid answers");
    });
  });

  describe("open answers", () => {
    it("converts the solution to a raw template literal", async () => {
      expect(await toJsx(":::answers{.open}\n?> 42\n:::")).toMatchInlineSnapshot(`
        "<AnswerGroup>
          <OpenAnswer correct={(String.raw)\`42\`} />
        </AnswerGroup>"
      `);
    });

    it("keeps backslashes in the solution", async () => {
      expect(await toJsx(":::answers{.open}\n?> a\\b\n:::")).toContain(
        "<OpenAnswer correct={(String.raw)`a\\b`} />",
      );
    });

    it("interpolates expressions (variants) in the solution", async () => {
      expect(await toJsx(":::answers{.open}\n?> {x + 1}0\n:::")).toMatch(
        /<OpenAnswer correct=\{\(String\.raw\)`\$\{x \+ 1\}0`\} \/>/,
      );
    });

    it("treats answers without a type as open answers", async () => {
      expect(await toJsx(":::answers\n?> ABC\n:::")).toContain(
        "<OpenAnswer correct={(String.raw)`ABC`} />",
      );
    });

    it("rejects formatted solutions", async () => {
      await expect(toJsx(":::answers{.open}\n?> *42*\n:::")).rejects.toThrow(
        "Open answer solution must be in plain text",
      );
    });

    it("rejects content that is not a paragraph", async () => {
      await expect(toJsx(":::answers{.open}\n- ?> 42\n:::")).rejects.toThrow(
        "Missing or invalid answers",
      );
    });

    it("ignores paragraphs without the `?> ` marker", async () => {
      const jsx = await toJsx(":::answers{.open}\n42\n:::");
      expect(jsx).not.toContain("AnswerGroup");
      expect(jsx).toContain('{"42"}');
    });

    // BUG: an empty open answer directive crashes with "Cannot read properties of undefined
    // (reading 'type')" instead of the usual error, because `remark-answers.ts:64` reads
    // `paragraph.type` without optional chaining (closed answers use `list?.type`).
    // Fix: `if (paragraph?.type !== "paragraph")`.
    it.fails("rejects an empty open answer with a clear error", async () => {
      await expect(toJsx(":::answers{.open}\n:::")).rejects.toThrow("Missing or invalid answers");
    });
  });

  it("ignores other directives", async () => {
    const jsx = await toJsx(":::note\n- [x] a\n:::");
    expect(jsx).not.toContain("Answer");
  });

  it("converts every blockquote into an explanation", async () => {
    expect(
      await toJsx("Text\n\n> The **solution**.\n>\n> More.\n\n> Another one"),
    ).toMatchInlineSnapshot(`
      "<>
        <p>
          {"Text"}
        </p>
        <Explanation>
          <p>
            {"The "}
            <strong>
              {"solution"}
            </strong>
            {"."}
          </p>
          <p>
            {"More."}
          </p>
        </Explanation>
        <Explanation>
          <p>
            {"Another one"}
          </p>
        </Explanation>
      </>"
    `);
  });
});
