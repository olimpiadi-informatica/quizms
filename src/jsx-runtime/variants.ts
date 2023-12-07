import { Program } from "estree";
import { is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";

import { Rng } from "~/utils/random";

export function shuffleAnswers(program: Program, variant: string) {
  let id = 0;
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isQuizmsComponent("AnswerGroup", comp)) {
        const rng = new Rng(`b#answers#${variant}#${id++}`);
        rng.shuffle(children);
        node.arguments = [comp, props, ...children];
      }
    },
  });
}

export function shuffleProblems(program: Program, variant: string) {
  let id = 0;
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isQuizmsComponent("Section", comp)) {
        const rng = new Rng(`b#section#${variant}#${id}`);
        rng.shuffle(children);
        node.arguments = [comp, props, ...children];
      }
      if (isQuizmsComponent("Problem", comp) && is.objectExpression(props)) {
        id++;
        for (const prop of props.properties) {
          if (
            is.property(prop) &&
            is.literal(prop.key) &&
            is.literal(prop.value) &&
            prop.key.value === "id"
          ) {
            prop.value.value = id;
          }
        }
      }
    },
  });
}

function isQuizmsComponent(name: string, expr?: Node) {
  return (
    is.memberExpression(expr) &&
    is.identifier(expr.object) &&
    expr.object.name === "quizms" &&
    is.identifier(expr.property) &&
    expr.property.name === name
  );
}
