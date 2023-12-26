import { AssignmentProperty, Program } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import { upperFirst } from "lodash-es";
import { Plugin } from "unified";

import { hash } from "~/utils/random";

const recmaVariants: Plugin<[], Program> = () => {
  return (ast, file) => {
    const found = findVariants(ast);
    if (found) {
      injectLocalVariables(ast, hash(file.value));
    }
  };
};

export default recmaVariants;

function findVariants(ast: Program) {
  let variantsFound = false;
  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node!;
      variantsFound ||= node.specifiers.some((specifier) => specifier.local.name === "variants");
    },
    VariableDeclarator(path) {
      const node = path.node!;
      variantsFound ||= is.identifier(node.id) && node.id.name === "variants";
      variantsFound ||=
        is.identifier(node.id) &&
        node.id.name === "frontmatter" &&
        is.objectExpression(node.init) &&
        node.init.properties.some(
          (property) =>
            is.property(property) &&
            ((is.identifier(property.key) && property.key.name === "variants") ||
              (is.literal(property.key) && property.key.value === "variants")),
        );
    },
  });

  return variantsFound;
}

const wellKnownGlobals = new Set(["console", "import", "parseInt", "undefined"]);

function injectLocalVariables(ast: Program, problemId: number) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(path) {
      const variableNames = Object.keys(path.scope!.globalBindings).filter(
        (name) => (name.length === 1 || name !== upperFirst(name)) && !wellKnownGlobals.has(name),
      );

      const node = path.node!;
      if (node.id?.name === "_createMdxContent") {
        // const __variantCount__ = (frontmatter?.variants ?? variants).length;
        const variantCount = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.identifier("__variantCount__"),
            b.memberExpression(
              b.logicalExpression(
                "??",
                b.memberExpression(
                  b.identifier("frontmatter"),
                  b.identifier("variants"),
                  false,
                  true,
                ),
                b.identifier("variants"),
              ),
              b.identifier("length"),
            ),
          ),
        ]);

        // props?.setVariantCount?.(__variantCount__);
        const setVariantCount = b.expressionStatement(
          b.callExpression(
            b.memberExpression(b.identifier("props"), b.identifier("setVariantCount"), false, true),
            [b.identifier("__variantCount__")],
            true,
          ),
        );

        // const __variant__ = (props?.variant ?? 0) % __variantCount__;
        const variant = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.identifier("__variant__"),
            b.binaryExpression(
              "%",
              b.logicalExpression(
                "??",
                b.callExpression(
                  b.memberExpression(b.identifier("props"), b.identifier("variant"), false, true),
                  [b.literal(problemId)],
                  true,
                ),
                b.literal(0),
              ),
              b.identifier("__variantCount__"),
            ),
          ),
        ]);

        // const { ... } = (frontmatter?.variants ?? variants)[__variant__];
        const variables = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.objectPattern(
              variableNames.map(
                (name) =>
                  b.property("init", b.identifier(name), b.identifier(name)) as AssignmentProperty,
              ),
            ),
            b.memberExpression(
              b.logicalExpression(
                "??",
                b.memberExpression(
                  b.identifier("frontmatter"),
                  b.identifier("variants"),
                  false,
                  true,
                ),
                b.identifier("variants"),
              ),
              b.identifier("__variant__"),
              true,
            ),
          ),
        ]);

        node.body.body.unshift(variantCount, setVariantCount, variant, variables);
      }
    },
  });
}
