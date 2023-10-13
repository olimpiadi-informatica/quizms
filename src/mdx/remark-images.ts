import { isAbsolute } from "node:path";

import { Parser } from "acorn";
import { Directive, Expression, ModuleDeclaration, Program } from "estree";
import { builders as b } from "estree-toolkit";
import _ from "lodash";
import { Image, Parent, Root, Text } from "mdast";
import { MdxJsxTextElement, MdxjsEsm } from "mdast-util-mdx";
import { Plugin } from "unified";
import { Node } from "unist";
import { SKIP, visit } from "unist-util-visit";

import { jsxAttribute } from "./utils";

const remarkImages: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const imports: ModuleDeclaration[] = [];

    visit(tree, "image", (image: Image, index, parent: Parent | undefined) => {
      if (/^https?:\/\//.test(image.url)) return;
      if (parent === undefined || index === undefined) {
        throw new Error("Image must have a parent");
      }

      const url = (isAbsolute(image.url) ? "" : "./") + image.url;
      const { alt, title } = image;
      const name = `__img__${imports.length}__`;

      const [path, query] = url.split("?");
      let imgSrc: Expression;

      if (path.includes("{")) {
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
                    b.literal(path.replace(/\{.*?}/g, "*")),
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

        const templateLiteral = `String.raw\`${path.replace(/{/g, "${")}\``;
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

      let siblingIndex = index - 1;
      let sibling: Node<any> | undefined = parent.children[siblingIndex];
      while (sibling?.type === "text" && /^\s*$/.test((sibling as Text).value)) {
        siblingIndex -= 1;
        sibling = parent.children[siblingIndex];
      }

      let container: MdxJsxTextElement;
      if (sibling?.data?.imgContainer) {
        container = sibling as MdxJsxTextElement;
        parent.children.splice(siblingIndex + 1, index - siblingIndex);
        index = siblingIndex + 1;
      } else {
        container = {
          type: "mdxJsxTextElement",
          name: "span",
          attributes: [jsxAttribute("className", "flex justify-center")],
          data: { imgContainer: true },
          children: [],
        };
        parent.children[index] = container;
      }

      container.children.push({
        type: "mdxJsxTextElement",
        name: "Image",
        children: [],
        attributes: _.compact([
          jsxAttribute("alt", alt ?? ""),
          jsxAttribute(
            "src",
            b.conditionalExpression(
              b.binaryExpression("===", b.unaryExpression("typeof", imgSrc), b.literal("function")),
              b.callExpression(imgSrc, [b.identifier("__variant__")]),
              imgSrc,
            ),
          ),
          title && jsxAttribute("title", title),
        ]),
      });

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
