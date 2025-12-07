import path from "node:path";

import { Parser } from "acorn";
import type { Directive, Expression, ModuleDeclaration } from "estree";
import { builders as b } from "estree-toolkit";
import { compact } from "lodash-es";
import type { Image, Parent, Root } from "mdast";
import type { MdxjsEsm } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

import { jsxAttribute } from "./utils";

declare module "unist" {
  interface Data {
    imgContainer?: boolean | undefined;
  }
}

const remarkImages: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const imports: ModuleDeclaration[] = [];

    visit(tree, "image", (image: Image, index, parent: Parent | undefined) => {
      if (parent === undefined || index === undefined) {
        throw new Error("Image must have a parent");
      }

      const url = (path.isAbsolute(image.url) ? "" : "./") + image.url;
      const { alt, title } = image;
      const name = `__img__${imports.length}__`;

      const [pathname, query] = url.split("?");
      let imgSrc: Expression;

      if (URL.canParse(image.url)) {
        imgSrc = b.literal(image.url);
      } else if (pathname.includes("{")) {
        const params = new URLSearchParams(query).entries();

        imports.push(
          b.exportNamedDeclaration(
            b.variableDeclaration("const", [
              b.variableDeclarator(
                b.identifier(name),
                b.callExpression(
                  b.memberExpression(
                    b.memberExpression(b.identifier("import"), b.identifier("meta")),
                    b.identifier("glob"),
                  ),
                  [
                    b.literal(pathname.replaceAll(/{.*?}/g, "*")),
                    b.objectExpression([
                      b.property("init", b.identifier("eager"), b.literal(true)),
                      b.property("init", b.identifier("import"), b.literal("default")),
                      b.property(
                        "init",
                        b.identifier("query"),
                        b.objectExpression(
                          Array.from(params, ([key, value]) =>
                            b.property("init", b.identifier(key), b.literal(value)),
                          ),
                        ),
                      ),
                    ]),
                  ],
                ),
              ),
            ]),
          ),
        );

        const templateLiteral = `String.raw\`${pathname.replaceAll("{", "${")}\``;
        const template = Parser.parse(templateLiteral, {
          ecmaVersion: "latest",
          sourceType: "module",
        });

        imgSrc = b.memberExpression(
          b.identifier(name),
          (template.body[0] as Directive).expression,
          true,
        );
      } else {
        imports.push(
          b.importDeclaration([b.importDefaultSpecifier(b.identifier(name))], b.literal(url)),
        );

        imgSrc = b.identifier(name);
      }

      if (pathname.endsWith(".asy")) {
        parent.children[index] = {
          type: "mdxJsxTextElement",
          name: "Asymptote",
          children: [],
          attributes: compact([
            jsxAttribute("alt", alt ?? ""),
            jsxAttribute(
              "src",
              b.callExpression(imgSrc, [
                b.conditionalExpression(
                  b.binaryExpression(
                    "===",
                    b.unaryExpression("typeof", b.identifier("_allVariants")),
                    b.literal("undefined"),
                  ),
                  { type: "Literal", value: null, raw: "null" },
                  b.memberExpression(b.identifier("_allVariants"), b.identifier("_variant"), true),
                ),
              ]),
            ),
            title && jsxAttribute("title", title),
          ]),
        };
      } else {
        parent.children[index] = {
          type: "mdxJsxTextElement",
          name: "Image",
          children: [],
          attributes: compact([
            jsxAttribute("alt", alt ?? ""),
            jsxAttribute("src", imgSrc),
            title && jsxAttribute("title", title),
          ]),
        };
      }

      return [SKIP, index];
    });

    tree.children.unshift({
      type: "mdxjsEsm",
      value: "",
      data: {
        estree: b.program(imports),
      },
    } as MdxjsEsm);
  };
};

export default remarkImages;
