import z from "zod";
import type { Student } from "~/models/student";

export const answerSchema = z.union([z.string(), z.number(), z.null()]);

export type Answer = z.infer<typeof answerSchema>;
export type AnswerOption = [Answer, number];

export const variantSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  schema: z.record(
    z.object({
      type: z.enum(["text", "number", "points"]),
      originalId: z.coerce.string().optional(),

      optionsCorrect: answerSchema.array().optional(),
      optionsBlank: answerSchema.array().optional(),
      optionsWrong: answerSchema.array().optional(),

      pointsCorrect: z.number(),
      pointsBlank: z.number(),
      pointsWrong: z.number(),
    }),
  ),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export function schemaOptions(schema: Schema[string]): AnswerOption[] {
  return [
    ...(schema.optionsCorrect?.map((o): AnswerOption => [o, schema.pointsCorrect]) ?? []),
    ...(schema.optionsBlank?.map((o): AnswerOption => [o, schema.pointsBlank]) ?? []),
    ...(schema.optionsWrong?.map((o): AnswerOption => [o, schema.pointsWrong]) ?? []),
  ];
}

export function parseAnswer(answer: string, schema: Schema[string]): Answer {
  let value: Answer = answer.trim().toUpperCase();
  if (!value) return null;

  if (schema.type === "number" || schema.type === "points") {
    value = Number(value);
  }
  isValidAnswer(value, schema);
  return value;
}

export function isValidAnswer(answer: Answer, schema: Schema[string]) {
  if (answer == null) return;
  switch (schema.type) {
    case "text": {
      const options = schemaOptions(schema).map(([o]) => o);
      if (!options.includes(answer)) {
        throw new Error(`La risposta "${answer}" non è valida`);
      }
      break;
    }
    case "number": {
      if (!Number.isInteger(answer)) {
        throw new TypeError("La risposta deve essere un numero intero");
      }
      break;
    }
    case "points": {
      if (typeof answer !== "number" || !Number.isInteger(answer)) {
        throw new TypeError("Il punteggio deve essere un numero intero");
      }
      if (!(0 <= answer && answer <= schema.pointsCorrect)) {
        throw new Error(`Il punteggio deve essere compreso tra 0 e ${schema.pointsCorrect}`);
      }
      break;
    }
  }
}

export function calcScore(student: Student, schema?: Schema) {
  if (student.absent || student.disabled) return;

  const answers = student.answers;

  if (!schema || !answers) return;

  let points = 0;
  for (const id in schema) {
    if (!(id in answers)) continue;

    const problem = schema[id];
    const answer = answers[id]?.toString()?.trim();

    const problemPoints = calcProblemScore(problem, answer);
    if (problemPoints === undefined) return;
    points += problemPoints;
  }

  return points;
}

export function calcProblemScore(problem: Schema[string], answer?: Answer) {
  if (problem.type === "points") {
    return answer as number;
  }

  const options = schemaOptions(problem);
  for (const [option, points] of options) {
    if (option === (answer ?? null)) {
      return points;
    }
  }

  return answer ? problem.pointsWrong : problem.pointsBlank;
}
