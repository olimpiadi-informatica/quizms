import z from "zod";

import type { Student } from "~/models/student";

export const answerSchema = z.union([z.string(), z.number(), z.null()]);

export const answerOptionSchema = z.object({
  value: answerSchema,
  points: z.number(),
});

export const clientVariantSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  schema: z.record(
    z.object({
      maxPoints: z.number(),
      allowEmpty: z.boolean(),
      kind: z.enum(["open", "allCorrect", "anyCorrect"]),
      options: answerOptionSchema.array(),
    }),
  ),
});

export const variantSchema = z.object({
  id: z.string(),
  isOnline: z.boolean(),
  isPdf: z.boolean(),
  contestId: z.string(),
  schema: z.record(
    z.intersection(
      z.object({
        type: z.enum(["text", "number"]),
        maxPoints: z.number(),
        originalId: z.string(),
        allowEmpty: z.boolean().default(true),
      }),
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.enum(["open"]),
          options: answerOptionSchema.array(),
        }),
        z.object({
          kind: z.enum(["allCorrect", "anyCorrect"]),
          options: answerOptionSchema
            .extend({
              originalId: z.string(),
            })
            .array(),
        }),
      ]),
    ),
  ),
});

export type Answer = z.infer<typeof answerSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];
export type ClientVariant = z.infer<typeof clientVariantSchema>;
export type ClientSchema = ClientVariant["schema"];

export function decodeAllCorrectAnswer(answer?: Answer): string[] {
  if (typeof answer !== "string") {
    return [];
  }
  try {
    return JSON.parse(answer);
  } catch {
    return [];
  }
}

export function encodeAllCorrectAnswer(value: string[]): Answer {
  return JSON.stringify(value);
}

export function parseAnswer(answer: string, schema: Schema[string]): Answer {
  let value: Answer = answer.trim().toUpperCase();
  if (!value) return null;

  if (schema.kind === "open") {
    if (schema.type === "number") {
      value = Number(value);
    }
  }

  if (schema.kind === "allCorrect") {
    value = encodeAllCorrectAnswer(answer.split(""));
  }

  isValidAnswer(value, schema);
  return value;
}

export function displayAnswer(answer: Answer, kind: Schema[string]["kind"]): string {
  switch (kind) {
    case "allCorrect": {
      const values = decodeAllCorrectAnswer(answer);
      return values.join("");
    }
    default: {
      if (answer === null) {
        return "";
      }
      return `${answer}`;
    }
  }
}

export function isValidAnswer(answer: Answer, schema: Schema[string]) {
  if (answer == null) return;
  if (schema.type === "number" && !Number.isInteger(answer)) {
    throw new TypeError("La risposta deve essere un numero intero");
  }

  switch (schema.kind) {
    case "anyCorrect": {
      if (!schema.options.some((option) => option.value === answer)) {
        throw new Error(`Opzione non valida: ${answer}`);
      }
      break;
    }
    case "allCorrect": {
      const values = decodeAllCorrectAnswer(answer);
      const wrong = values.filter(
        (value) => !schema.options.some((option) => option.value === value),
      );
      if (wrong.length >= 1) {
        throw new Error(`Opzioni non valide: ${wrong.join("")}`);
      }
      if (new Set(values).size !== values.length) {
        throw new Error(`Opzioni ripetute: ${values.join("")}`);
      }
      break;
    }
    default: {
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

    const points = calcProblemPoints(problem, answer);
    score += points;
  }

  return score;
}

export function calcProblemPoints(problem: Schema[string], answer?: Answer) {
  if (problem.kind === "allCorrect") {
    const values = decodeAllCorrectAnswer(answer);
    if (values.length === 0) {
      return 1; // TODO: save points in schema
    }
    const correctOptions = problem.options.filter((option) => option.points === 5);
    if (
      correctOptions.length !== values.length &&
      correctOptions.some((option) => !values.some((value) => option.value === value))
    ) {
      return 0;
    }
    return 5;
  }
  for (const option of problem.options ?? []) {
    if (option.value === (answer ?? null)) {
      return option.points;
    }
  }

  if (problem.kind === "anyCorrect") {
    return 1;
  }
  if ((problem.kind === "open" && answer === undefined) || answer === null || answer === "") {
    return 1;
  }
  return 0;
}
