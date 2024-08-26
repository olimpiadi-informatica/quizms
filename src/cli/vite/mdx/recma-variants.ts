import path from "node:path";

import type { AssignmentProperty, Node, Program, Property, Statement } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import type { Plugin } from "unified";

import { hash } from "~/utils/hash";

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
        if (process.env.QUIZMS_MODE !== "contest") {
          // import React from "react";
          const importReact = b.importDeclaration(
            [b.importDefaultSpecifier(b.identifier("_react$q"))],
            b.literal("react"),
          );
          ast.body.unshift(importReact);
        }

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

        let variant: Statement;
        if (process.env.QUIZMS_MODE === "contest") {
          const problem = path.dirname(file);
          console.info(`hash(${problem}) = ${hash(problem) % 524_287}`);

          // A prime number smaller than √ MAX_SAFE_INTEGER
          const MODULE = 14_985_317;

          // const _variant = ((QUIZMS_VARIANT % MODULE) * (hash % MODULE) % MODULE) % _allVariants.length;
          variant = b.variableDeclaration("const", [
            b.variableDeclarator(
              b.identifier("_variant"),
              b.binaryExpression(
                "%",
                b.binaryExpression(
                  "%",
                  b.binaryExpression(
                    "*",
                    b.binaryExpression(
                      "%",
                      b.memberExpression(
                        b.memberExpression(b.identifier("process"), b.identifier("env")),
                        b.identifier("QUIZMS_VARIANT"),
                      ),
                      b.literal(MODULE),
                    ),
                    b.literal(hash(problem) % MODULE),
                  ),
                  b.literal(MODULE),
                ),
                b.memberExpression(b.identifier("_allVariants"), b.identifier("length")),
              ),
            ),
          ]);
        } else {
          // const [_variant, _setVariant] = useState(0);
          variant = b.variableDeclaration("const", [
            b.variableDeclarator(
              b.arrayPattern([b.identifier("_variant"), b.identifier("_setVariant")]),
              b.callExpression(
                b.memberExpression(b.identifier("_react$q"), b.identifier("useState")),
                [b.literal(0)],
              ),
            ),
          ]);
        }

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
                    b.literal("Invalid variable name `"),
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

        node.body.body.unshift(
          allVariants,
          variant,
          checkVariableNames,
          ...checkVariables,
          variables,
        );

        if (process.env.QUIZMS_MODE === "development") {
          injectVariantSelect(node.body.body.at(-1));
        }
      }
    },
  });
}

function injectVariantSelect(ret?: Node) {
  // return jsx(SubProblem, {
  //   children: [
  //     <select>{...}</select>,   <-- inject here
  //     ...
  //   ]
  // });
  if (
    ret?.type !== "ReturnStatement" ||
    ret.argument?.type !== "CallExpression" ||
    ret.argument.callee.type !== "Identifier" ||
    ret.argument.callee.name !== "_jsxDEV"
  ) {
    throw new Error("Invalid return statement");
  }

  const props = ret.argument.arguments[1];
  if (props.type !== "ObjectExpression") throw new Error("Invalid return expression");

  const children = props.properties.find(
    (p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === "children",
  ) as Property | undefined;
  if (children?.value.type !== "ArrayExpression") {
    throw new Error("Invalid return expression");
  }

  /*
    <select
      className="select select-ghost absolute right-0 top-0"
      value={variant}
      onChange={(e) => setVariant(+e.target.value)}>
      {Array.from({ length: _allVariants.length }, (_, i) => (
        <option key={i} value={i}>
          Variante {i + 1}
        </option>
      ))}
    </select>
  */
  children.value.elements.push(
    b.callExpression(b.identifier("_jsxDEV"), [
      b.literal("select"),
      b.objectExpression([
        b.property(
          "init",
          b.identifier("className"),
          b.literal("select select-ghost absolute right-0 top-0"),
        ),
        b.property("init", b.identifier("value"), b.identifier("_variant")),
        b.property(
          "init",
          b.identifier("onChange"),
          b.arrowFunctionExpression(
            [b.identifier("e")],
            b.callExpression(b.identifier("_setVariant"), [
              b.unaryExpression(
                "+",
                b.memberExpression(
                  b.memberExpression(b.identifier("e"), b.identifier("target")),
                  b.identifier("value"),
                ),
                true,
              ),
            ]),
          ),
        ),
        b.property(
          "init",
          b.identifier("children"),
          b.callExpression(b.memberExpression(b.identifier("Array"), b.identifier("from")), [
            b.objectExpression([
              b.property(
                "init",
                b.identifier("length"),
                b.memberExpression(b.identifier("_allVariants"), b.identifier("length")),
              ),
            ]),
            b.arrowFunctionExpression(
              [b.identifier("_"), b.identifier("i")],
              b.callExpression(b.identifier("_jsxDEV"), [
                b.literal("option"),
                b.objectExpression([
                  b.property("init", b.identifier("value"), b.identifier("i")),
                  b.property(
                    "init",
                    b.identifier("children"),
                    b.binaryExpression(
                      "+",
                      b.literal("Variante "),
                      b.binaryExpression("+", b.identifier("i"), b.literal(1)),
                    ),
                  ),
                ]),
                b.identifier("i"),
              ]),
            ),
          ]),
        ),
      ]),
    ]),
  );
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
