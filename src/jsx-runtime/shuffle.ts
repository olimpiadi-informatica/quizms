import { Program, Property } from "estree";
import { builders as b, is, traverse } from "estree-toolkit";
import { Node } from "estree-toolkit/dist/estree";
import { countBy, mapKeys } from "lodash-es";
import { isString } from "lodash-es";

import { error, warning } from "~/cli/utils/logs";
import { Schema, Solution } from "~/models";
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

export function getSolutions(program: Program) {
  const id = [0, 0];
  let originalId = "";
  let answerId = 0;

  const solution: Solution["answers"] = {};

  function setAnswer(id: number[], value: any) {
    if (!value && !isString(value)) {
      error(`Problem ${id} solution must be a non-empty string.`);
      return;
    }
    if (solution[`${id}`]) {
      warning(`Problem ${id} has multiple solutions.`);
    }
    solution[`${id}`] = {
      value,
      originalId,
    };
  }

  traverse(program, {
    CallExpression(path) {
      const node = path.node!;
      const [comp, props] = node.arguments;
      if (isQuizmsComponent(comp, "Problem")) {
        id[0]++;
        id[1] = 0;
        originalId = (getPropValue(props, "originalId") as string) ?? "";
      }
      if (isQuizmsComponent(comp, "SubProblem")) {
        id[1]++;
        answerId = 0;
      }
      if (isQuizmsComponent(comp, "Answer")) {
        const label = String.fromCharCode(65 + answerId++);
        const correct = getPropValue(props, "correct");
        if (correct) {
          setAnswer(id, label);
        }
      }
      if (isQuizmsComponent(comp, "OpenAnswer")) {
        setAnswer(id, getPropValue(props, "correct"));
      }
    },
  });

  return renameKeys(solution);
}

export function getSchema(program: Program) {
  const id = [0, 0];
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
        } as Schema[string];
      }
      if (isQuizmsComponent(comp, "Answer")) {
        const label = String.fromCharCode(65 + answerId++);
        if (schema[`${id}`].options) {
          schema[`${id}`].options!.push(label);
        } else {
          schema[`${id}`].options = [label];
        }
      }
      if (isQuizmsComponent(comp, "OpenAnswer")) {
        const correct = getPropValue(props, "correct");
        if (isString(correct) && /^\d+$/.test(correct)) {
          schema[`${id}`].type = "number";
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
