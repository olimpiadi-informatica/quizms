import z from "zod";

import { answerSchema } from "~/models/variant";

export const studentSchema = z
  .object({
    uid: z.string(),
    userData: z.record(z.union([z.string(), z.number(), z.date()]).optional()),
    userDataHash: z.string(),

    absent: z.boolean(),
    disabled: z.boolean(),

    participationId: z.string(),
    contestId: z.string(),
    token: z.string(),
    startedAt: z.date(),
    finishedAt: z.date(),

    variant: z.string(),
    answers: z.record(answerSchema),
    score: z.number(),
    maxScore: z.number(),
    extraData: z.record(z.any()),

    createdAt: z.coerce.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;
