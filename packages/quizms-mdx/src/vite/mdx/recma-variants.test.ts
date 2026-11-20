import { hash } from "@olinfo/quizms/utils";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { afterEach, describe, expect, it, vi } from "vitest";

import recmaRemoveExports from "./recma-remove-exports";
import recmaVariants from "./recma-variants";
import { compileMdx, testFilePath } from "./test-utils";

const compileVariants = (source: string, { development = false, path = testFilePath } = {}) =>
  compileMdx(
    source,
    {
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      recmaPlugins: [recmaRemoveExports, recmaVariants],
      development,
      jsx: !development,
    },
    path,
  );

/** Returns the statements injected at the beginning of `_createMdxContent`. */
const prelude = (code: string) =>
  /function _createMdxContent\(props\) \{\n([\s\S]*?)\n {2}(?:const _components|return)/.exec(
    code,
  )?.[1];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("recmaVariants", () => {
  describe("without variants", () => {
    it("leaves files without free variables unchanged", async () => {
      const source = "Max: {Math.max(1, 2)}, {undefined}, {String(1)}";
      const code = await compileVariants(source);
      expect(code).not.toContain("throw");
      expect(code).toBe(
        await compileMdx(source, {
          remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
          recmaPlugins: [recmaRemoveExports],
        }),
      );
    });

    it("throws at render time if a variable is used", async () => {
      const code = await compileVariants("Value: {x + y}");
      expect(prelude(code)).toBe(
        '  throw new Error("Undefined variable `x` in file `p-1-test/question.md`. If you are using variants, make sure to imports them first.");',
      );
    });

    it("treats single uppercase letters as variables", async () => {
      const code = await compileVariants("Value: {N}");
      expect(code).toContain("Undefined variable `N`");
    });
  });

  describe("with variants", () => {
    it.each([
      ["frontmatter", "---\nvariants:\n  - x: 1\n---\n\n{x}"],
      ["an exported constant", "export const variants = [{ x: 1 }];\n\n{x}"],
      ["an import", 'import variants from "./variants.py";\n\n{x}'],
    ])("detects variants defined by %s", async (_, source) => {
      const code = await compileVariants(source);
      expect(code).toContain("const _allVariants = frontmatter?.variants ?? variants;");
      expect(code).not.toContain("Undefined variable");
    });

    it("does not consider other frontmatter keys", async () => {
      const code = await compileVariants("---\ntitle: test\n---\n\n{x}");
      expect(code).toContain("Undefined variable `x`");
    });

    it("selects the variant from the variant hash and the problem folder", async () => {
      const code = await compileVariants("export const variants = [{ x: 1 }];\n\n{x} {Y}");
      const problemHash = hash("p-1-test") % 14_985_317;
      expect(prelude(code)).toBe(
        [
          "  const _allVariants = frontmatter?.variants ?? variants;",
          `  const _variant = process.env.QUIZMS_VARIANT_HASH % 14985317 * ${problemHash} % _allVariants.length;`,
          '  for (const _variable of Object.keys(_allVariants[_variant])) if ((/^[^a-z]./).test(_variable)) throw new Error("Invalid variable name `" + _variable + "` in file `p-1-test/question.md`: variable names must start with a lowercase letter.");',
          '  if (!(("x" in _allVariants[_variant]))) throw new Error("Variable `x` is not defined in file `p-1-test/question.md`.");',
          '  if (!(("Y" in _allVariants[_variant]))) throw new Error("Variable `Y` is not defined in file `p-1-test/question.md`.");',
          "  const {x: x, Y: Y} = _allVariants[_variant];",
        ].join("\n"),
      );
    });

    it("uses the same variant for all translations of a problem", async () => {
      const source = "export const variants = [{ x: 1 }];\n\n{x}";
      const variant = (code: string) => /const _variant = .*/.exec(code)?.[0];
      const base = await compileVariants(source);
      const en = await compileVariants(source, { path: "/contest/p-1-test/question.en.md" });
      expect(variant(en)).toBe(variant(base));
      expect(en).toContain("in file `p-1-test/question.en.md`");
    });

    it("selects the variant interactively in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const code = await compileVariants("export const variants = [{ x: 1 }];\n\nValue: {x}", {
        development: true,
      });
      expect(code).toMatch(
        /^import \{useDevVariant as _useDevVariant\$q\} from "@olinfo\/quizms-mdx\/components";\n/,
      );
      // The state is shared by all the translations of the problem, identified by its folder.
      expect(code).toContain(
        'const [_variant, _setVariant] = _useDevVariant$q("/contest/p-1-test");',
      );
      expect(code).toContain('_jsxDEV("select", {');
      expect(code).toContain("onChange: e => _setVariant(+e.target.value),");
      expect(code).toContain('children: "Variante " + (i + 1)');
    });
  });
});
