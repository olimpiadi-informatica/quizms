import type { Schema } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import { fatal } from "@olinfo/quizms/utils-node";
import { unescape as unescapeHtml } from "lodash-es";
import { temporaryWriteSync } from "tempy";
import yaml from "yaml";
import { z } from "zod";

export function parseRawSchema(rawSchemaHtml: string): Schema {
  const rawSchemaEscaped = unescapeHtml(rawSchemaHtml);

  let rawSchema: z.infer<typeof rawSchemaSchema>;
  try {
    rawSchema = validate(rawSchemaSchema, yaml.parse(rawSchemaEscaped));
  } catch (err: any) {
    const tempFile = temporaryWriteSync(rawSchemaEscaped, { extension: "yaml" });
    fatal(`Invalid schema:\n${err.message}\nSchema written to ${tempFile}`);
  }
  const schema: Schema = {};
  for (const problem of rawSchema) {
    for (const subProblem of problem.subProblems) {
      const id =
        subProblem.subProblemId == null
          ? `${problem.id}`
          : `${problem.id}.${subProblem.subProblemId}`;
      const originalId =
        subProblem.subProblemId == null
          ? `${problem.originalId}`
          : `${problem.originalId}.${subProblem.subProblemId}`;

      const baseProblem = {
        originalId,
        pointsCorrect: problem.pointsCorrect,
        pointsBlank: problem.pointsBlank,
        pointsWrong: problem.pointsWrong,
      };

      switch (subProblem.type) {
        case "openNumber":
          schema[id] = { ...baseProblem, type: "openNumber", correct: subProblem.correct };
          break;
        case "openText":
          schema[id] = { ...baseProblem, type: "openText", correct: subProblem.correct };
          break;
        case "multipleChoice": {
          const options = subProblem.options.map((option) => option.originalId);
          const correct = subProblem.options.find((option) => option.correct)!.originalId;
          schema[id] = { ...baseProblem, type: "multipleChoice", options, correct };
          break;
        }
        case "multipleResponse": {
          const options = subProblem.options.map((option) => option.originalId);
          const correct = subProblem.options
            .filter((option) => option.correct)
            .map((option) => option.id);
          schema[id] = { ...baseProblem, type: "multipleResponse", options, correct };
          break;
        }
        case "blockly": {
          for (let i = 0; i < subProblem.numTestcases; i++) {
            schema[`${problem.id}.${i}`] = {
              ...baseProblem,
              originalId: `${problem.originalId}.${i}`,
              type: "complex",
              correct: "",
            };
          }
          break;
        }
      }
    }
  }
  return schema;
}

const problemSchema = z.discriminatedUnion("type", [
  z.strictObject({
    subProblemId: z.number().nullable(),
    type: z.literal("openNumber"),
    correct: z.number(),
  }),
  z.strictObject({
    subProblemId: z.number().nullable(),
    type: z.literal("openText"),
    correct: z.string(),
  }),
  z.strictObject({
    subProblemId: z.number().nullable(),
    type: z.union([z.literal("multipleChoice"), z.literal("multipleResponse")]),
    options: z
      .strictObject({
        id: z.string(),
        originalId: z.string(),
        correct: z.boolean(),
      })
      .array()
      .nonempty(),
  }),
  z.strictObject({
    subProblemId: z.null(),
    type: z.literal("blockly"),
    numTestcases: z.number(),
  }),
]);

const rawSchemaSchema = z
  .strictObject({
    id: z.number(),
    originalId: z.number(),
    pointsCorrect: z.number(),
    pointsBlank: z.number(),
    pointsWrong: z.number(),
    subProblems: z.array(problemSchema).nonempty(),
  })
  .array()
  .nonempty();
