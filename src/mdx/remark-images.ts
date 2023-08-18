import { Parser } from "acorn";
import { Directive, Expression, ModuleDeclaration, Program } from "estree";
import { builders as b } from "estree-toolkit";
import _ from "lodash";
import { Image, Parent, Root } from "mdast";
import { MdxjsEsm } from "mdast-util-mdxjs-esm";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { jsxAttribute } from "~/mdx/utils";

const remarkImages: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const imports: ModuleDeclaration[] = [];
    visit(tree, "image", (image: Image, index, parent: Parent | undefined) => {
      const { alt, title } = image;
      let { url } = image;

      if (/^https?:\/\//.test(url)) return;
      if (!/^\.\.?\//.test(url)) url = `./${url}`;

      const name = `__img__${imports.length}__`;

      let imgSrc: Expression;

      if (/\{.*?}/.test(url)) {
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
                    b.literal(url.replace(/\{.*?}/g, "*")),
                    b.objectExpression([
                      b.property("init", b.identifier("eager"), b.literal(true)),
                      b.property("init", b.identifier("import"), b.literal("default")),
                    ]),
                  ],
                ),
              ),
            ]),
          ),
        );

        const templateLiteral = `String.raw\`${url.replace(/{/g, "${")}\``;
        const template = Parser.parse(templateLiteral, {
          ecmaVersion: "latest",
          sourceType: "module",
        }) as unknown as Program;

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

      parent!.children[index!] = {
        type: "mdxJsxTextElement",
        name: "img",
        children: [],
        attributes: _.compact([
          jsxAttribute("alt", alt),
          jsxAttribute("src", b.memberExpression(imgSrc, b.identifier("src"))),
          jsxAttribute("width", b.memberExpression(imgSrc, b.identifier("width"))),
          jsxAttribute("height", b.memberExpression(imgSrc, b.identifier("height"))),
          title && jsxAttribute("title", title),
        ]),
      };
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
