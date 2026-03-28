import { xor } from "lodash-es";
import z from "zod";

import type { Student } from "~/models/student";

export const answerValues = {
  openNumber: z.number(),
  openText: z.string(),
  multipleChoice: z.string(),
  multipleResponse: z.array(z.string()),
  blockly: z.strictObject({
    results: z.array(z.boolean()),
    metadata: z.record(z.string(), z.any()),
  }),
};

export const answerSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("openNumber"),
    value: answerValues.openNumber.nullable(),
  }),
  z.strictObject({
    type: z.literal("openText"),
    value: answerValues.openText.nullable(),
  }),
  z.strictObject({
    type: z.literal("multipleChoice"),
    value: answerValues.multipleChoice.nullable(),
  }),
  z.strictObject({
    type: z.literal("multipleResponse"),
    value: answerValues.multipleResponse.nullable(),
  }),
  z.strictObject({
    type: z.literal("blockly"),
    value: answerValues.blockly.nullable(),
  }),
]);

export const optionSchema = z.strictObject({
  id: z.string(),
  correct: z.boolean(),
  originalId: z.string(),
});

const baseProblemSchema = z.strictObject({
  pointsCorrect: z.number(),
  pointsBlank: z.number(),
  pointsWrong: z.number(),
  originalId: z.string(),
});

const problemSchema = z.discriminatedUnion("type", [
  baseProblemSchema.extend({
    type: z.literal("openNumber"),
    correct: z.array(answerValues.openNumber),
  }),
  baseProblemSchema.extend({
    type: z.literal("openText"),
    correct: z.array(answerValues.openText),
  }),
  baseProblemSchema.extend({
    type: z.literal("multipleResponse"),
    options: z.array(optionSchema),
  }),
  baseProblemSchema.extend({
    type: z.literal("multipleChoice"),
    options: z.array(optionSchema),
  }),
  baseProblemSchema.extend({
    type: z.literal("blockly"),
    numTestcases: z.number(),
  }),
]);

export const variantSchema = z.strictObject({
  id: z.string(),
  isOnline: z.boolean(),
  isPdf: z.boolean(),
  contestId: z.string(),
  schema: z.record(z.string(), problemSchema),
});

export type Schema = Variant["schema"];
export type ProblemType = Schema[string]["type"];
export type Problem<T extends ProblemType = ProblemType> = Extract<Schema[string], { type: T }>;
export type Answer<T extends ProblemType = ProblemType> = Extract<
  z.infer<typeof answerSchema>,
  { type: T }
>;
export type AnswerValue<T extends ProblemType = ProblemType> = NonNullable<Answer<T>["value"]>;
export type Variant = z.infer<typeof variantSchema>;

export function parseAnswer(answer: string, problem: Problem): Answer | undefined {
  const value = answer.trim().toUpperCase();
  if (!value) return undefined;
  switch (problem.type) {
    case "openNumber":
      return {
        value: Number(value),
        type: "openNumber",
      };
    case "multipleResponse":
      return {
        value: value.split(""),
        type: "multipleResponse",
      };
    case "openText":
      return {
        value: value,
        type: "openText",
      };
    case "multipleChoice":
      return {
        value: value,
        type: "multipleChoice",
      };
    case "blockly":
      throw new Error("Unsupported problem type");
  }
}

export function displayAnswer(answer?: Answer): string {
  if (answer?.value == null) {
    return "";
  }
  switch (answer.type) {
    case "openNumber":
      return String(answer.value);
    case "openText":
    case "multipleChoice":
      return answer.value;
    case "multipleResponse":
      return answer.value.join("");
    case "blockly":
      return answer.value.results.map((c) => (c ? "✅" : "❌")).join("");
  }
}

export function validateAnswerValue(
  answer: AnswerValue | null,
  schema: Schema[string],
): [string] | null {
  if (answer == null || answer === "") return null;

  switch (schema.type) {
    case "openNumber": {
      if (!Number.isInteger(answer as AnswerValue<"openNumber">)) {
        return ["La risposta deve essere un numero intero"];
      }
      return null;
    }
    case "openText": {
      if ((answer as AnswerValue<"openText">).length > 256) {
        return ["La risposta non può essere più lunga di 256 caratteri"];
      }
      return null;
    }
    case "multipleChoice": {
      if (
        !schema.options.map((option) => option.id).includes(answer as AnswerValue<"multipleChoice">)
      ) {
        return [`Opzione non valida: ${answer}`];
      }
      return null;
    }
    case "multipleResponse": {
      const mrAnswer = answer as AnswerValue<"multipleResponse">;
      const optionValues = schema.options.map((option) => option.id);
      const wrong = mrAnswer.filter((value) => !optionValues.includes(value));
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
  if (student.absent || student.disabled) return null;

  const answers = student.answers;

  if (!schema || !answers) return null;

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
  if (answer?.value == null || answer.value === "" || answer.type !== problem.type) {
    return problem.pointsBlank;
  }

  switch (problem.type) {
    case "openNumber":
      return problem.type === answer.type && problem.correct.includes(answer.value)
        ? problem.pointsCorrect
        : problem.pointsWrong;
    case "openText":
      return problem.type === answer.type && problem.correct.includes(answer.value)
        ? problem.pointsCorrect
        : problem.pointsWrong;
    case "multipleChoice":
      return problem.type === answer.type &&
        problem.options
          .filter((option) => option.correct)
          .map((option) => option.id)
          .includes(answer.value)
        ? problem.pointsCorrect
        : problem.pointsWrong;
    case "multipleResponse": {
      const multipleAnswer = answer.value as AnswerValue<"multipleResponse">;
      const correct = problem.options.filter((option) => option.correct).map((option) => option.id);
      if (multipleAnswer.length === 0) return problem.pointsBlank;

      return xor(multipleAnswer, correct).length === 0
        ? problem.pointsCorrect
        : problem.pointsWrong;
    }
    case "blockly":
      return (answer.value as AnswerValue<"blockly">).results
        .map((tc) => (tc ? problem.pointsCorrect : problem.pointsWrong))
        .reduce((a, b) => a + b, 0);
  }
}

export function unshuffleAnswer<T extends ProblemType>(
  pproblem: Problem<T>,
  answerValue: AnswerValue<T>,
): AnswerValue<T> {
  const problem = pproblem as Problem;
  if (problem.type === "openNumber" || problem.type === "openText" || problem.type === "blockly") {
    return answerValue;
  }
  const unshuffleValue = (id: AnswerValue<"multipleResponse" | "multipleChoice">) =>
    problem.options.find((option) => option.id === id)?.originalId ?? "";
  if (problem.type === "multipleResponse") {
    return (answerValue as string[]).map(unshuffleValue) as AnswerValue<T>;
  }
  if (problem.type === "multipleChoice") {
    return (answerValue ? unshuffleValue(answerValue as string) : answerValue) as AnswerValue<T>;
  }
  throw Error("Unknown problem type");
}
