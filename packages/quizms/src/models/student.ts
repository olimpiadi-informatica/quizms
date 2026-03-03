import z from "zod";

import { answerSchema } from "~/models/variant";

export const studentSchema = z
  .object({
    uid: z.string(),
    userData: z
      .object({
        surname: z.string(),
        name: z.string(),
      })
      .partial()
      .catchall(z.union([z.string(), z.number(), z.date()])),
    userDataHash: z.string(),

    absent: z.boolean(),
    disabled: z.boolean(),

    venueId: z.string(),
    contestId: z.string(),
    token: z.string(),

    contestRange: z.object({
      start: z.date(),
      end: z.date(),
    }),

    variantId: z.string(),
    answers: z.record(z.string(), answerSchema),
    score: z.number(),
    maxScore: z.number(),
    extraData: z.record(z.string(), z.any()),

    createdAt: z.coerce.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;
