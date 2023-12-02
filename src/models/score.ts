import { zip } from "lodash-es";

import { Solution } from "~/models/solution";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";

export function score(student: Student, variants: Variant[], solutions: Solution[]) {
  const answers = student.answers;
  const variant = variants.find((variant) => variant.id === student.variant);
  const solution = solutions.find((solution) => solution.id === student.variant)?.answers;
  const schema = variant?.schema;

  if (!schema || !answers || !solution) return undefined;
  const points = zip(schema, answers, solution).reduce((acc, [schema, answer, sol]) => {
    if (
      schema?.pointsCorrect === undefined ||
      schema?.pointsBlank === undefined ||
      schema?.pointsWrong === undefined ||
      answer === undefined ||
      sol === undefined
    ) {
      return NaN;
    }

    if (answer.toUpperCase() === sol.toUpperCase()) {
      return acc + schema.pointsCorrect;
    }
    if (answer.toUpperCase() === schema?.blankOption?.toUpperCase()) {
      return acc + schema.pointsBlank;
    }
    return acc + schema.pointsWrong;
  }, 0);

  return isNaN(points) ? undefined : points;
}

export function maxScore(schema?: Variant["schema"]) {
  if (!schema) return NaN;
  return schema.reduce((acc, schema) => {
    if (schema?.pointsCorrect === undefined) return NaN;
    return acc + schema.pointsCorrect;
  }, 0);
}
