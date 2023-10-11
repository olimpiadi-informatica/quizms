import { AssignmentProperty, Program } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import _ from "lodash";
import { Plugin } from "unified";

const recmaVariants: Plugin<[], Program> = () => {
  return (ast) => {
    const found = findVariants(ast);
    if (found) {
      injectLocalVariables(ast);
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
    },
  });

  return variantsFound;
}

const wellKnownGlobals = new Set(["console", "import", "parseInt"]);

function injectLocalVariables(ast: Program) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(path) {
      const variables = Object.keys(path.scope!.globalBindings).filter(
        (name) => (name.length === 1 || name !== _.upperFirst(name)) && !wellKnownGlobals.has(name),
      );

      const node = path.node!;
      if (node.id?.name === "_createMdxContent") {
        node.body.body.unshift(
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
                b.identifier("variants"),
                b.logicalExpression(
                  "??",
                  b.memberExpression(b.identifier("props"), b.identifier("variant")),
                  b.literal(0),
                ),
                true,
              ),
            ),
          ]),
        );
      }
    },
  });
}
