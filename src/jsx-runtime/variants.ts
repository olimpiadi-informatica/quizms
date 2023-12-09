import { Program } from "estree";
import { is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";
import { size } from "lodash-es";

import { Schema } from "~/models/variant";
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

export function getAnswers(program: Program, remove: boolean) {
  let probId = 0,
    subId = 0,
    ansId = 0;
  let [pointsCorrect, pointsBlank, pointsWrong] = [0, 0, 0];
  const answers: Record<string, Record<string, string>> = {};
  const schema: Record<string, Schema> = {};
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props] = node.arguments;
      if (isQuizmsComponent("Problem", comp)) {
        probId++;
        answers[probId.toString()] = {};
        schema[probId.toString()] = {};
        subId = 0;

        if (is.objectExpression(props)) {
          for (const prop of props.properties) {
            if (is.property(prop) && is.literal(prop.key) && prop.key.value == "points") {
              if (is.arrayExpression(prop.value)) {
                [pointsCorrect, pointsBlank, pointsWrong] = prop.value.elements.map((x) => x.value);
              }
            }
          }
        }
      }
      if (isQuizmsComponent("SubProblem", comp)) {
        subId++;
        ansId = 0;
        schema[probId.toString()][subId.toString()] = {
          id: "",
          type: "text",
          pointsCorrect,
          pointsBlank,
          pointsWrong,
        };
      }
      if (isQuizmsComponent("Answer", comp) && is.objectExpression(props)) {
        ansId++;
        const answerLabel = String.fromCharCode(64 + ansId);
        if (schema[probId.toString()][subId.toString()].options)
          schema[probId.toString()][subId.toString()].options!.push(answerLabel);
        else schema[probId.toString()][subId.toString()].options = [answerLabel];
        for (const prop of props.properties) {
          if (getPropertyKey(prop) == "correct" && getPropertyVal(prop) === true) {
            answers[probId.toString()][subId.toString()] = answerLabel;
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

  const flatAnswers: Record<string, string> = {};
  const flatSchema: Schema = {};
  for (const probId in answers) {
    for (const subId in answers[probId]) {
      const id = size(answers[probId]) == 1 ? `${probId}` : `${probId}.${subId}`;
      flatAnswers[id] = answers[probId][subId];
      console.log(id, probId, `${probId}.${subId}`);
      flatSchema[id] = schema[probId][subId];
      flatSchema[id].id = id;
    }
  }
  return { answers: flatAnswers, schema: flatSchema };
}

function getPropertyKey(property: Node) {
  if (is.property(property) && is.literal(property.key) && is.literal(property.value)) {
    return property.key.value;
  } else {
    return undefined;
  }
}

function getPropertyVal(property: Node) {
  if (is.property(property) && is.literal(property.key) && is.literal(property.value)) {
    return property.value.value;
  } else {
    return undefined;
  }
}

function setPropertyVal(property: Node, value: string | number) {
  if (is.property(property) && is.literal(property.key) && is.literal(property.value)) {
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
