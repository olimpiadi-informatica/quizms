import { Program, Property } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";
import { countBy, isString, mapKeys } from "lodash-es";

import { Schema } from "~/models";
import { error, warning } from "~/utils/logs";
import { Rng } from "~/utils/random";

export function shuffleAnswers(program: Program, variant: string) {
  let id = 0;
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isQuizmsComponent(comp, "AnswerGroup")) {
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
      const [comp, props] = node.arguments;
      if (isQuizmsComponent(comp, "Problem") && is.objectExpression(props)) {
        id++;
        props.properties.push(b.property("init", b.literal("originalId"), b.literal(id), false));
      }
    },
  });

  id = 0;
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props, ...children] = node.arguments;
      if (isQuizmsComponent(comp, "Section")) {
        const rng = new Rng(`b#section#${variant}#${id}`);
        rng.shuffle(children);
        node.arguments = [comp, props, ...children];
      }
      if (isQuizmsComponent(comp, "Problem")) {
        id++;
        const idProp = getProp(props, "id");
        if (idProp) {
          idProp.value = b.literal(id);
        } else {
          error(`Problem ${id} must have an id.`);
        }
      }
    },
  });
}

export function cleanStatement(program: Program) {
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props] = node.arguments;
      if (isQuizmsComponent(comp, "Problem")) {
        removeProp(props, "originalId");
      }
      if (isQuizmsComponent(comp, "Answer")) {
        removeProp(props, "correct");
      }
      if (isQuizmsComponent(comp, "OpenAnswer")) {
        removeProp(props, "correct");
      }
    },
  });
}

export function getSchema(program: Program) {
  const id = [0, 0];
  let originalId = 0;
  let answerId = 0;
  let points: number[] = [];

  const schema: Schema = {};
  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props] = node.arguments;

      if (isQuizmsComponent(comp, "Problem")) {
        id[0]++;
        id[1] = 0;

        const pointsProp = getProp(props, "points");
        if (is.arrayExpression(pointsProp?.value)) {
          points = pointsProp.value.elements.map((x) => (is.literal(x) ? Number(x.value) : 0));
        } else {
          error(`Problem ${id} must have a valid points array.`);
        }
        originalId = getPropValue(props, "originalId") as number;
      }

      if (isQuizmsComponent(comp, "SubProblem")) {
        id[1]++;
        answerId = 0;
        const [pointsCorrect, pointsBlank, pointsWrong] = points;
        schema[`${id}`] = {
          type: "text",
          pointsCorrect,
          pointsBlank,
          pointsWrong,
          blankOption: "-", // TODO
          originalId: String(originalId),
        };
      }

      if (isQuizmsComponent(comp, "Answer")) {
        const problemSchema = schema[`${id}`];
        const label = String.fromCharCode(65 + answerId++);
        if (problemSchema.options) {
          problemSchema.options!.push(label);
        } else {
          problemSchema.options = [label];
        }
        const correct = getPropValue(props, "correct");
        if (correct) {
          if ("solution" in problemSchema) {
            warning(`Problem ${id} has multiple solutions.`);
          }
          problemSchema.solution = label;
        }
      }

      if (isQuizmsComponent(comp, "OpenAnswer")) {
        const problemSchema = schema[`${id}`];
        const correct = getPropValue(props, "correct");
        if (!correct || !isString(correct)) {
          error(`Problem ${id} solution must be a non-empty string.`);
        } else {
          if ("solution" in problemSchema) {
            warning(`Problem ${id} has multiple solutions.`);
          }
          problemSchema.solution = correct;
          if (/^\d+$/.test(correct)) {
            problemSchema.type = "number";
          }
        }
      }
    },
  });

  return renameKeys(schema);
}

function removeProp(props: Node, name: string) {
  if (!is.objectExpression(props)) return;
  props.properties = props.properties.filter(
    (prop) => !is.property(prop) || !is.literal(prop.key) || prop.key.value !== name,
  );
}

function getProp(props: Node, name: string) {
  if (!is.objectExpression(props)) return;
  return props.properties.find(
    (prop) => is.property(prop) && is.literal(prop.key) && prop.key.value === name,
  ) as Property;
}

function getPropValue(props: Node, name: string) {
  const prop = getProp(props, name);
  if (is.literal(prop?.value)) {
    return prop.value.value;
  }
}

function isQuizmsComponent(expr: Node, name: string) {
  return (
    is.memberExpression(expr) &&
    is.identifier(expr.object) &&
    expr.object.name === "Quizms" &&
    is.identifier(expr.property) &&
    expr.property.name === name
  );
}

function renameKeys<T>(obj: Record<string, T>) {
  const keys = countBy(Object.keys(obj), (key) => key.split(",")[0]);
  return mapKeys(obj, (_, key) => {
    const parts = key.split(",");
    return parts.slice(0, keys[parts[0]]).join(".");
  });
}
