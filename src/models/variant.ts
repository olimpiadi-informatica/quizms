import z from "zod";

import { Student } from "~/models/student";

export const variantSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  schema: z.record(
    z.object({
      type: z.enum(["text", "number", "points"]),
      originalId: z.coerce.string().optional(),

      optionsCorrect: z.string().array().optional(),
      optionsBlank: z.string().array().optional(),
      optionsWrong: z.string().array().optional(),

      pointsCorrect: z.number().optional(),
      pointsBlank: z.number().optional(),
      pointsWrong: z.number().optional(),
    }),
  ),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export function score(student: Student, variants: Record<string, Variant>) {
  if (student.absent || student.disabled) return;

  const answers = student.answers;
  const schema = variants[student.variant!]?.schema;

  if (!schema || !answers) return;

  let points = 0;
  for (const id in schema) {
    if (!(id in answers)) continue;

    const problem = schema[id];
    const answer = answers[id]?.toString()?.trim();

    const problemPoints = problemScore(problem, answer);
    if (problemPoints === undefined) return;
    points += problemPoints;
  }

  return points;
}

export function problemScore(problem: Schema[string], answer?: string) {
  if (problem.type === "points") {
    return Number(answer || 0);
  }

  if (
    problem.pointsCorrect === undefined ||
    problem.pointsBlank === undefined ||
    problem.pointsWrong === undefined ||
    problem.optionsCorrect === undefined
  ) {
    return;
  }

  if (answer === undefined || problem.optionsBlank?.includes(answer)) {
    return problem.pointsBlank;
  } else if (problem.optionsCorrect.includes(answer)) {
    return problem.pointsCorrect;
  } else {
    return problem.pointsWrong;
  }
}
