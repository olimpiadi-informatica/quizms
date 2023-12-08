import { Program } from "estree";
import { is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";
import { size } from "lodash-es"

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
          if (getPropertyKey(prop) == "id") {
            setPropertyVal(prop, id);
          }
        }
      }
    },
  });
}

export function getAnswers(program: Program, remove: Boolean) {
  let probId = 0, subId = 0, ansId = 0;
  const answers: {[key: string]: {[key: string]: string} } = {}
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isQuizmsComponent("Problem", comp)) {
        probId++;
        answers[probId.toString()] = {};
        subId = 0;
      }
      if (isQuizmsComponent("SubProblem", comp)) {
        subId++;
        ansId = 0;
      }
      if (isQuizmsComponent("Answer", comp) && is.objectExpression(props)) {
        ansId++;
        for (const prop of props.properties) {
          if (getPropertyKey(prop) == "correct" && getPropertyVal(prop) === true) {
            answers[probId.toString()][subId.toString()] = String.fromCharCode(64 + ansId); 
          }
        }
        if (remove) {
          props.properties = props.properties.filter((prop) => getPropertyKey(prop) !== "correct");
        }
      }
      if (isQuizmsComponent("OpenAnswer", comp) && is.objectExpression(props)) {
        for (const prop of props.properties) {
          if (getPropertyKey(prop) == "correct") {
            const correct = getPropertyVal(prop);
            if (typeof correct === "string") {
              answers[probId.toString()][subId.toString()] = correct;
            }
          }
        }
        if (remove) {
          props.properties = props.properties.filter((prop) => getPropertyKey(prop) !== "correct");
        }
      }
    },
  });

  const flatAnswers: {[key: string]: string} = {} = {}
  for (let probId in answers)
  {
    for (let subId in answers[probId]) {
      if (size(answers[probId]) == 1) {
        flatAnswers[`${probId}`] = answers[probId][subId];
      }
      else {
        flatAnswers[`${probId}.${subId}`] = answers[probId][subId];
      }
    }
  }
  return flatAnswers;
}

function getPropertyKey(property: Node) {
  if(is.property(property) &&
    is.literal(property.key) &&
    is.literal(property.value)) {
    return property.key.value;
  }
  else {
    return undefined;
  }
}

function getPropertyVal(property: Node) {
  if(is.property(property) &&
    is.literal(property.key) &&
    is.literal(property.value)) {
    return property.value.value;
  }
  else {
    return undefined;
  }
}

function setPropertyVal(property: Node, value: string | number) {
  if(is.property(property) &&
    is.literal(property.key) &&
    is.literal(property.value)) {
    property.value.value = value;
  }
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
