import path from "node:path";

import { AssignmentProperty, Program } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import { Plugin } from "unified";

const recmaVariants: Plugin<[], Program> = () => {
  return (ast, file) => {
    const found = findVariants(ast);
    if (found) {
      injectLocalVariables(ast, path.join(path.basename(file.dirname ?? ""), file.basename ?? ""));
    } else {
      checkUndefinedVariables(
        ast,
        path.join(path.basename(file.dirname ?? ""), file.basename ?? ""),
      );
    }
  };
};

export default recmaVariants;

function findVariants(ast: Program) {
  let variantsFound = false;
  traverse(ast, {
    ImportDeclaration(nodePath) {
      const node = nodePath.node!;
      variantsFound ||= node.specifiers.some((specifier) => specifier.local.name === "variants");
    },
    VariableDeclarator(nodePath) {
      const node = nodePath.node!;
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

function injectLocalVariables(ast: Program, file: string) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(nodePath) {
      const variableNames = Object.keys(nodePath.scope!.globalBindings).filter(
        (name) => /^([a-z]|[A-Z]$)/.test(name) && name !== "import" && name !== "undefined",
      );

      const node = nodePath.node!;
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
                  [],
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
        //     throw new Error(`Invalid variable name ${_variable}`);
        const checkVariableNames = b.forOfStatement(
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
                    b.literal(`Invalid variable name \``),
                    b.identifier("_variable"),
                  ),
                  b.literal(
                    `\` in file \`${file}\`: variable names must start with a lowercase letter.`,
                  ),
                ),
              ]),
            ),
          ),
          false,
        );

        // if (!("name" in _allVariants[_variant]))
        //   throw new Error(`Variable \`${_name}\` is not defined`);
        const checkVariables = variableNames.map((name) =>
          b.ifStatement(
            b.unaryExpression(
              "!",
              b.binaryExpression(
                "in",
                b.literal(name),
                b.memberExpression(b.identifier("_allVariants"), b.identifier("_variant"), true),
              ),
            ),
            b.throwStatement(
              b.newExpression(b.identifier("Error"), [
                b.literal(`Variable \`${name}\` is not defined in file \`${file}\`.`),
              ]),
            ),
          ),
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

        node.body.body.unshift(
          allVariants,
          variant,
          checkVariableNames,
          ...checkVariables,
          variables,
          setVariantCount,
        );
      }
    },
  });
}

function checkUndefinedVariables(ast: Program, file: string) {
  traverse(ast, {
    $: { scope: true },

    FunctionDeclaration(nodePath) {
      const variableNames = Object.keys(nodePath.scope!.globalBindings).filter(
        (name) => /^([a-z]|[A-Z]$)/.test(name) && name !== "import" && name !== "undefined",
      );

      const node = nodePath.node!;
      if (node.id?.name === "_createMdxContent" && variableNames.length > 0) {
        node.body.body.unshift(
          b.throwStatement(
            b.newExpression(b.identifier("Error"), [
              b.literal(
                `Undefined variable \`${variableNames[0]}\` in file \`${file}\`. If you are using variants, make sure to imports them first.`,
              ),
            ]),
          ),
        );
      }
    },
  });
}
