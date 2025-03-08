import type { Program } from "estree";
import { traverse } from "estree-toolkit";
import type { Plugin } from "unified";

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
