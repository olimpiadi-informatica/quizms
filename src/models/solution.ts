import z from "zod";

import { Student } from "./student";
import { Variant } from "./variant";

export const solutionSchema = z.object({
  id: z.string(),
  answers: z.record(
    z.object({
      value: z.string(),
      originalId: z.coerce.string(),
    }),
  ),
});

export type Solution = z.infer<typeof solutionSchema>;

export function score(student: Student, variants: Variant[], solutions: Solution[]) {
  const answers = student.answers;
  const variant = variants.find((variant) => variant.id === student.variant);
  const solution = solutions.find((solution) => solution.id === student.variant)?.answers;
  const schema = variant?.schema;

  if (!schema || !answers || !solution) return undefined;

  let points = 0;
  for (const id in schema) {
    const problem = schema[id];
    const answer = answers[id]?.trim();
    const sol = solution[id].value;

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
