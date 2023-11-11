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

const wellKnownGlobals = new Set(["console", "import", "parseInt"]);

function injectLocalVariables(ast: Program, problemId: number) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(path) {
      const variables = Object.keys(path.scope!.globalBindings).filter(
        (name) => (name.length === 1 || name !== upperFirst(name)) && !wellKnownGlobals.has(name),
      );

      const node = path.node!;
      if (node.id?.name === "_createMdxContent") {
        node.body.body.unshift(
          b.variableDeclaration("const", [
            b.variableDeclarator(
              b.identifier("__variant__"),
              b.binaryExpression(
                "%",
                b.logicalExpression(
                  "??",
                  b.memberExpression(b.identifier("props"), b.identifier("variant"), false, true),
                  b.literal(0),
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
                  b.identifier("length"),
                ),
              ),
            ),
          ]),
          b.variableDeclaration("const", [
            b.variableDeclarator(
              b.objectPattern(
                variables.map(
                  (name) =>
                    b.property(
                      "init",
                      b.identifier(name),
                      b.identifier(name),
                    ) as AssignmentProperty,
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
          ]),
        );
      }
    },
  });
}
