import { Solution } from "~/models/solution";
import { Student } from "~/models/student";
import { SchemaDoc } from "~/models/variant";

export function score(student: Student, variants: SchemaDoc[], solutions: Solution[]) {
  const answers = student.answers;
  const variant = variants.find((variant) => variant.id === student.variant);
  const solution = solutions.find((solution) => solution.id === student.variant)?.answers;
  const schema = variant?.schema;

  if (!schema || !answers || !solution) return undefined;

  let points = 0;
  for (const id in schema) {
    const problem = schema[id];
    const answer = answers[id];
    const sol = solution[id];

    if (
      problem.pointsCorrect === undefined ||
      problem.pointsBlank === undefined ||
      problem.pointsWrong === undefined ||
      sol === undefined
    ) {
      return undefined;
    }

    if (answer === undefined || answer === "") {
      points += problem.pointsBlank;
    } else if (answer.toUpperCase() === sol.toUpperCase()) {
      points += problem.pointsCorrect;
    } else {
      points += problem.pointsWrong;
    }
  }

  return points;
}
