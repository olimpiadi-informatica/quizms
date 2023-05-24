import { Program, VariableDeclaration } from "estree";
import { visit } from "estree-util-visit";
import { Plugin } from "unified";

const recmaVariants: Plugin<[], Program> = () => {
  return (ast) => {
    const variantsKeys: string[] = [];
    visit(ast, (node) => {
      if (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        node.id.name === "variants" &&
        node.init?.type === "ArrayExpression"
      ) {
        for (const element of node.init.elements) {
          if (element?.type !== "ObjectExpression") continue;
          for (const property of element.properties) {
            if (property.type !== "Property") continue;
            let key: string | undefined;
            if (property.key.type === "Identifier") {
              key = property.key.name;
            } else if (property.key.type === "Literal" && typeof property.key.value === "string") {
              key = property.key.value;
            }
            if (key && !variantsKeys.includes(key)) variantsKeys.push(key);
          }
        }
      }
      if (
        node.type === "FunctionDeclaration" &&
        node.id?.name === "_createMdxContent" &&
        variantsKeys.length > 0
      ) {
        node.body.body.unshift(buildDeclaration(variantsKeys));
      }
    });
  };
};

export default recmaVariants;

function buildDeclaration(keys: string[]): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [
      {
        type: "VariableDeclarator",
        id: {
          type: "ObjectPattern",
          properties: keys.map((name) => ({
            type: "Property",
            kind: "init",
            method: false,
            shorthand: true,
            computed: false,
            key: {
              type: "Identifier",
              name,
            },
            value: {
              type: "Identifier",
              name,
            },
          })),
        },
        init: {
          type: "MemberExpression",
          computed: true,
          optional: false,
          object: {
            type: "Identifier",
            name: "variants",
          },
          property: {
            type: "MemberExpression",
            computed: false,
            optional: false,
            object: {
              type: "Identifier",
              name: "props",
            },
            property: {
              type: "Identifier",
              name: "variant",
            },
          },
        },
      },
    ],
  };
}
