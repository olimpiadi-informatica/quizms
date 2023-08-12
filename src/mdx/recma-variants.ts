import { Program } from "estree";
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
  const variant = parseInt(process.env.QUIZMS_VARIANT ?? "");

  let variantsFound = false;
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node!;
      if (is.identifier(node.id) && node.id.name === "variants") {
        const init = node.init;
        if (!is.arrayExpression(init)) {
          throw new Error(
            `invalid problem variants: variable's type must be an array, \`${init?.type}\` is not an array`,
          );
        }
        variantsFound = true;
        if (variant >= 0 && variant < init.elements.length) {
          // TODO
          init.elements = init.elements.slice(variant, variant + 1);
        }
      }
    },
  });

  return variantsFound;
}

const wellKnownGlobals = new Set(["console", "parseInt"]);

function isGlobal(name: string) {
  return name === _.upperFirst(name) || wellKnownGlobals.has(name);
}

function injectLocalVariables(ast: Program) {
  let mdxScope = false;

  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration: {
      enter(path) {
        mdxScope = true;

        const node = path.node!;
        if (node.id?.name === "_createMdxContent") {
          node.body.body.unshift(
            b.variableDeclaration("const", [
              b.variableDeclarator(
                b.identifier("_v"),
                b.memberExpression(
                  b.identifier("variants"),
                  b.memberExpression(b.identifier("props"), b.identifier("variant")),
                  true,
                ),
              ),
            ]),
          );
        }
      },
      leave() {
        mdxScope = false;
      },
    },

    Identifier(path) {
      if (!mdxScope || !is.expression(path.parent)) return;

      const name = path.node!.name;
      const scope = path.scope!;
      if (!scope.hasBinding(name) && scope.hasGlobalBinding(name) && !isGlobal(name)) {
        path.replaceWith(b.memberExpression(b.identifier("_v"), b.identifier(name))).skip();
      }
    },
  });
}
