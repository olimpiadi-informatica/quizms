import { ExpressionStatement, Program } from "estree";
import { visit } from "estree-util-visit";
import { Plugin } from "unified";

const recmaVariants: Plugin<[], Program> = () => {
  const variant = parseInt(process.env.QUIZMS_VARIANT ?? "");

  return (ast) => {
    let variantsFound = false;

    visit(ast, (node) => {
      if (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        node.id.name === "variants"
      ) {
        if (node.init?.type !== "ArrayExpression") {
          throw new Error(
            `invalid problem variants: variable's type must be an array, \`${node.init?.type}\` is not an array`,
          );
        }
        variantsFound = true;
        if (variant >= 0 && variant < node.init.elements.length) {
          node.init.elements = node.init.elements.slice(variant, variant + 1);
        }
      }
      if (
        node.type === "FunctionDeclaration" &&
        node.id?.name === "_createMdxContent" &&
        variantsFound
      ) {
        node.body.body.unshift(buildDeclaration());
      }
    });
  };
};

export default recmaVariants;

function buildDeclaration(): ExpressionStatement {
  return {
    type: "ExpressionStatement",
    expression: {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "Identifier",
          name: "Object",
        },
        property: {
          type: "Identifier",
          name: "assign",
        },
        computed: false,
        optional: false,
      },
      arguments: [
        {
          type: "Identifier",
          name: "globalThis",
        },
        {
          type: "MemberExpression",
          object: {
            type: "Identifier",
            name: "variants",
          },
          property: {
            type: "MemberExpression",
            object: {
              type: "Identifier",
              name: "props",
            },
            property: {
              type: "Identifier",
              name: "variant",
            },
            computed: false,
            optional: false,
          },
          computed: true,
          optional: false,
        },
      ],
      optional: false,
    },
  };
}
