import { AssignmentProperty, Program } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
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

function injectLocalVariables(ast: Program, problemId: number) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(path) {
      const variableNames = Object.keys(path.scope!.globalBindings).filter(
        (name) => /^([a-z]|[A-Z]$)/.test(name) && name !== "import" && name !== "undefined",
      );

      const node = path.node!;
      if (node.id?.name === "_createMdxContent") {
        // const _allVariants = frontmatter?.variants ?? variants;
        const allVariants = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.identifier("_allVariants"),
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
          ),
        ]);

        // const _variant = (props?.variant ?? 0) % _allVariants.length;
        const variant = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.identifier("_variant"),
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
              b.memberExpression(b.identifier("_allVariants"), b.identifier("length")),
            ),
          ),
        ]);

        // for (const _variable of Object.keys(_allVariants[_variant]))
        //   if (/^[^a-z]./.test(name))
        //     throw new Error(`Invalid variable name: ${_variable}`);
        const checkVariables = b.forOfStatement(
          b.variableDeclaration("const", [b.variableDeclarator(b.identifier("_variable"))]),
          b.callExpression(b.memberExpression(b.identifier("Object"), b.identifier("keys")), [
            b.memberExpression(b.identifier("_allVariants"), b.identifier("_variant"), true),
          ]),
          b.ifStatement(
            b.callExpression(
              b.memberExpression(
                {
                  type: "Literal",
                  regex: {
                    pattern: "^[^a-z].",
                    flags: "",
                  },
                },
                b.identifier("test"),
              ),
              [b.identifier("_variable")],
            ),
            b.throwStatement(
              b.newExpression(b.identifier("Error"), [
                b.binaryExpression(
                  "+",
                  b.binaryExpression(
                    "+",
                    b.literal("Invalid variable name: `"),
                    b.identifier("_variable"),
                  ),
                  b.literal("`. Variables names must start with a lowercase letter."),
                ),
              ]),
            ),
          ),
          false,
        );

        // const { ... } = _allVariants[_variant];
        const variables = b.variableDeclaration("const", [
          b.variableDeclarator(
            b.objectPattern(
              variableNames.map(
                (name) =>
                  b.property("init", b.identifier(name), b.identifier(name)) as AssignmentProperty,
              ),
            ),
            b.memberExpression(b.identifier("_allVariants"), b.identifier("_variant"), true),
          ),
        ]);

        // props?.setVariantCount?.(_allVariants.length);
        const setVariantCount = b.expressionStatement(
          b.callExpression(
            b.memberExpression(b.identifier("props"), b.identifier("setVariantCount"), false, true),
            [b.memberExpression(b.identifier("_allVariants"), b.identifier("length"))],
            true,
          ),
        );

        node.body.body.unshift(allVariants, variant, checkVariables, variables, setVariantCount);
      }
    },
  });
}
