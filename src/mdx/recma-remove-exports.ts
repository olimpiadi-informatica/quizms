import { Program } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import { Plugin } from "unified";

const recmaRemoveExports: Plugin<[], Program> = () => {
  return (ast) => {
    traverse(ast, {
      ExportNamedDeclaration(path) {
        if (path.node?.declaration) {
          path.replaceWith(path.node.declaration);
        }
      },
    });
  };
};

export default recmaRemoveExports;
