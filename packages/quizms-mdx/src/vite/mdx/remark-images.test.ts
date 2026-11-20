import { describe, expect, it } from "vitest";

import remarkImages from "./remark-images";
import { compileMdx } from "./test-utils";

// The plugin only rewrites the syntax tree: the images are resolved later by Vite.
const compileImages = (source: string) => compileMdx(source, { remarkPlugins: [remarkImages] });

/** The import declarations and the returned JSX of the compiled file. */
async function images(source: string) {
  const code = await compileImages(source);
  const start = code.indexOf("*/\n", code.indexOf("@jsxImportSource")) + 3;
  return {
    imports: code.slice(start, code.indexOf("function _createMdxContent")).trim(),
    jsx: /^ {2}return (.*);$/m.exec(code)?.[1].replaceAll("_components.", ""),
  };
}

describe("remarkImages", () => {
  it("imports local images", async () => {
    expect(await images('![A figure](fig.png "Title")')).toEqual({
      imports: 'import __img__0__ from "./fig.png";',
      jsx: '<p><Image alt={"A figure"} src={__img__0__} title={"Title"} /></p>',
    });
  });

  it("keeps absolute paths and query parameters", async () => {
    const { imports, jsx } = await images("![](/assets/fig.png?w=100)");
    expect(imports).toBe('import __img__0__ from "/assets/fig.png?w=100";');
    expect(jsx).toBe('<p><Image alt={""} src={__img__0__} /></p>');
  });

  it("does not import remote images", async () => {
    expect(await images("![remote](https://example.com/a.png)")).toEqual({
      imports: "",
      jsx: '<p><Image alt={"remote"} src={"https://example.com/a.png"} /></p>',
    });
  });

  it("numbers the images of a file", async () => {
    const { imports } = await images("![a](a.png) ![b](https://example.com/b.png) ![c](c.png)");
    expect(imports).toBe('import __img__0__ from "./a.png";\nimport __img__1__ from "./c.png";');
  });

  it("globs images whose path depends on variables", async () => {
    expect(await images("![g](img/{x}-{y}.png?w=3&s=2)")).toMatchInlineSnapshot(`
      {
        "imports": "export const __img__0__ = import.meta.glob("./img/*-*.png", {
        eager: true,
        import: "default",
        query: {
          w: "3",
          s: "2"
        }
      });",
        "jsx": "<p><Image alt={"g"} src={__img__0__[(String.raw)\`./img/\${x}-\${y}.png\`]} /></p>",
      }
    `);
  });

  it("passes the current variant to asymptote images", async () => {
    expect(await images("![asy](fig.asy?v=variants.py)")).toEqual({
      imports: 'import __img__0__ from "./fig.asy?v=variants.py";',
      jsx: '<p><Asymptote alt={"asy"} src={__img__0__(typeof _allVariants === "undefined" ? null : _allVariants[_variant])} /></p>',
    });
  });

  it("leaves files without images unchanged", async () => {
    const code = await compileImages("No images here");
    expect(code).toBe(await compileMdx("No images here"));
  });
});
