import { isString, xor } from "lodash-es";
import z from "zod";

import type { Student } from "~/models/student";

export const answerSchemas = {
  openNumber: z.number(),
  openText: z.string(),
  multipleChoice: z.string(),
  multipleResponse: z.array(z.string()),
  complex: z.strictObject({
    display: z.enum(["✅", "❌"]),
    metadata: z.record(z.string(), z.any()),
  }),
};

export const answerSchema = z.union(Object.values(answerSchemas));

const baseProblemSchema = z.strictObject({
  pointsCorrect: z.number(),
  pointsBlank: z.number(),
  pointsWrong: z.number(),
  originalId: z.string(),
});

const problemSchema = z.discriminatedUnion("type", [
  baseProblemSchema.extend({
    type: z.literal("openNumber"),
    correct: answerSchemas.openNumber,
  }),
  baseProblemSchema.extend({
    type: z.literal("openText"),
    correct: answerSchemas.openText,
  }),
  baseProblemSchema.extend({
    type: z.literal("multipleResponse"),
    correct: answerSchemas.multipleResponse,
    options: z.array(z.string()),
  }),
  baseProblemSchema.extend({
    type: z.literal("multipleChoice"),
    correct: answerSchemas.multipleChoice,
    options: z.array(z.string()),
  }),
  baseProblemSchema.extend({
    type: z.literal("complex"),
    correct: z.literal(""),
  }),
]);

export const variantSchema = z.strictObject({
  id: z.string(),
  isOnline: z.boolean(),
  isPdf: z.boolean(),
  contestId: z.string(),
  schema: z.record(z.string(), problemSchema),
});

export type AnswerType = Schema[string]["type"];
export type Answer<T extends AnswerType = AnswerType> = z.infer<(typeof answerSchemas)[T]>;
export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export function parseAnswer(answer: string, schema: Schema[string]): Answer | undefined {
  const value = answer.trim().toUpperCase();
  if (!value) return undefined;

  switch (schema.type) {
    case "openNumber":
      return Number(value);
    case "multipleResponse":
      return answer.split("");
    case "openText":
    case "multipleChoice":
      return value;
    case "complex":
      throw new Error("Unsupported problem type");
  }
}

export function displayAnswer(answer: Answer | null | undefined, type: AnswerType): string {
  if (answer == null) {
    return "";
  }
  switch (type) {
    case "openNumber":
      return String(answer as Answer<"openNumber">);
    case "openText":
    case "multipleChoice":
      return answer as Answer<"openText" | "multipleChoice">;
    case "multipleResponse":
      return (answer as Answer<"multipleResponse">).join("");
    case "complex":
      return isString(answer) ? answer : (answer as Answer<"complex">).display;
  }
}

export function validateAnswer(
  answer: Answer | null | undefined,
  schema: Schema[string],
): [string] | null {
  if (answer == null || answer === "") return null;

  switch (schema.type) {
    case "openNumber": {
      if (!Number.isInteger(answer as Answer<"openNumber">)) {
        return ["La risposta deve essere un numero intero"];
      }
      return null;
    }
    case "openText": {
      if ((answer as Answer<"openText">).length > 256) {
        return ["La risposta non può essere più lunga di 256 caratteri"];
      }
      return null;
    }
    case "multipleChoice": {
      if (!schema.options.includes(answer as Answer<"multipleChoice">)) {
        return [`Opzione non valida: ${answer}`];
      }
      return null;
    }
    case "multipleResponse": {
      const mrAnswer = answer as Answer<"multipleResponse">;
      const wrong = mrAnswer.filter((value) => !schema.options.includes(value));
      if (wrong.length >= 1) {
        return [`Opzioni non valide: ${wrong.join("")}`];
      }
      if (new Set(mrAnswer).size !== mrAnswer.length) {
        return [`Opzioni ripetute: ${mrAnswer.join("")}`];
      }
      return null;
    }
  }
  return null;
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

export function calcProblemPoints(problem: Schema[string], answer?: Answer): number {
  if (answer == null || answer === "") return problem.pointsBlank;

  switch (problem.type) {
    case "openNumber":
    case "openText":
    case "multipleChoice":
      return answer === problem.correct ? problem.pointsCorrect : problem.pointsWrong;
    case "multipleResponse": {
      const multipleAnswer = answer as Answer<"multipleResponse">;
      if (multipleAnswer.length === 0) return problem.pointsBlank;

      return xor(multipleAnswer, problem.correct).length === 0
        ? problem.pointsCorrect
        : problem.pointsWrong;
    }
    case "complex":
      return (answer as Answer<"complex">).display === "✅"
        ? problem.pointsCorrect
        : problem.pointsWrong;
  }
}

export function unshuffleAnswer(_problem: Schema[string], _answer?: Answer) {
  throw new Error("Not implemented");
  // if (problem.type === "open") {
  //   return answer;
  // }
  // const unshuffleAnswer = (value: Answer) =>
  //   problem.options.find((option) => option.value === value)?.originalId ?? "";
  // if (problem.type === "multipleResponse") {
  //   const values = decodeMultipleResponseAnswer(answer);
  //   const unshuffledValues = values.map(unshuffleAnswer);
  //   return encodeMultipleResponseAnswer(unshuffledValues);
  // }
  // if (problem.type === "multipleChoice") {
  //   return answer ? unshuffleAnswer(answer) : answer;
  // }
}
