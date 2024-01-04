import z from "zod";

import { Student } from "~/models/student";

export const variantSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  schema: z.record(
    z.object({
      type: z.enum(["text", "number"]),
      options: z.string().array().nonempty().optional(),
      blankOption: z.string().optional(),
      pointsCorrect: z.number().optional(),
      pointsBlank: z.number().optional(),
      pointsWrong: z.number().optional(),
      solution: z.string().optional(),
      originalId: z.coerce.string().optional(),
    }),
  ),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export type VariantMapping = z.infer<typeof variantMappingSchema>;

export function score(student: Student, variants: Record<string, Variant>) {
  const answers = student.answers;
  const schema = variants[student.variant!]?.schema;

  if (!schema || !answers) return undefined;

  let points = 0;
  for (const id in schema) {
    const problem = schema[id];
    const answer = answers[id]?.trim();

    if (
      problem.pointsCorrect === undefined ||
      problem.pointsBlank === undefined ||
      problem.pointsWrong === undefined ||
      problem.solution === undefined
    ) {
      return undefined;
    }

    if (answer === undefined || answer === "" || answer === problem.blankOption) {
      points += problem.pointsBlank;
    } else if (answer.toUpperCase() === problem.solution.toUpperCase()) {
      points += problem.pointsCorrect;
    } else {
      points += problem.pointsWrong;
    }
  }

  return points;
}
