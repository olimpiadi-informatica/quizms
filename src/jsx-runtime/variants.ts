import { Program } from "estree";
import { is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";

import { Rng } from "~/utils/random";

export function shuffleAnswers(program: Program, variant: string) {
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isAnswerGroup(comp)) {
        const rng = new Rng(`b#answers#${variant}#${/* TODO */ 42}`);
        rng.shuffle(children);
        node.arguments = [comp, props, ...children];
      }
    },
  });
}

export function shuffleProblems(program: Program, variant: string) {
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isSection(comp)) {
        const rng = new Rng(`b#problems#${variant}#${/* TODO */ 42}`);
        rng.shuffle(children);
        node.arguments = [comp, props, ...children];
      }
    },
  });
}

function isAnswerGroup(expr?: Node) {
  return (
    is.memberExpression(expr) &&
    is.identifier(expr.object) &&
    expr.object.name === "quizms" &&
    is.identifier(expr.property) &&
    expr.property.name === "AnswerGroup"
  );
}

function isSection(expr?: Node) {
  return (
    is.memberExpression(expr) &&
    is.identifier(expr.object) &&
    expr.object.name === "quizms" &&
    is.identifier(expr.property) &&
    expr.property.name === "Section"
  );
}
