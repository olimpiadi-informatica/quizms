import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import z from "zod";

import type { Student } from "~/models/student";

export const answerSchema = z.union([z.string(), z.number(), z.null()]);

export const answerOptionSchema = z.object({
  value: answerSchema,
  points: z.number(),
  originalId: z.string().optional(),
});

export const variantSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  schema: z.record(
    z.object({
      type: z.enum(["text", "number", "points"]),
      maxPoints: z.number(),
      originalId: z.coerce.string().optional(),
      options: answerOptionSchema.array().optional(),
      allowEmpty: z.boolean().default(true),
    }),
  ),
});

export type Answer = z.infer<typeof answerSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export function parseAnswer(
  answer: string,
  schema: Schema[string],
  t: (descriptor: MessageDescriptor) => string,
): Answer {
  let value: Answer = answer.trim().toUpperCase();
  if (!value) return null;

  const options = schema.options?.map((option) => option.value) ?? [];
  if (!options.includes(value) && (schema.type === "number" || schema.type === "points")) {
    value = Number(value);
  }
  isValidAnswer(value, schema, t);
  return value;
}

export function isValidAnswer(
  answer: Answer,
  schema: Schema[string],
  t: (descriptor: MessageDescriptor) => string,
) {
  if (answer == null || schema.options?.some((option) => option.value === answer)) return;
  switch (schema.type) {
    case "text": {
      throw new Error(t(msg`The answer "${answer}" is not valid`));
    }
    case "number": {
      if (!Number.isInteger(answer)) {
        throw new TypeError(t(msg`The answer must be an integer`));
      }
      break;
    }
    case "points": {
      if (typeof answer !== "number" || !Number.isInteger(answer)) {
        throw new TypeError(t(msg`The score must be an integer`));
      }
      if (!(0 <= answer && answer <= schema.maxPoints)) {
        throw new Error(t(msg`The score must be between 0 and ${schema.maxPoints}`));
      }
      break;
    }
  }
}

export function calcScore(student: Student, schema?: Schema) {
  if (student.absent || student.disabled) return;

  const answers = student.answers;

  if (!schema || !answers) return;

  let score = 0;
  for (const id in schema) {
    const problem = schema[id];
    const answer = answers[id];
    if (!problem.allowEmpty && (answer == null || answer === "")) return;

    const points = calcProblemPoints(problem, answer);
    if (points == null) return;
    score += points;
  }

  return score;
}

export function calcProblemPoints(problem: Schema[string], answer?: Answer) {
  for (const option of problem.options ?? []) {
    if (option.value === (answer ?? null)) {
      return option.points;
    }
  }

  if (problem.type === "points") {
    return answer as number;
  }

  return 0;
}
