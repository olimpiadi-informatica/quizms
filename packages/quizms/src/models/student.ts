import z from "zod";

import { answerSchema } from "~/models/variant";

export const studentSchema = z.object({
  id: z.string(),
  userData: z
    .object({
      surname: z.string(),
      name: z.string(),
    })
    .partial()
    .catchall(z.union([z.string(), z.number(), z.date()])), // TODO: tag this union

  name: z.string(),
  surname: z.string(),

  absent: z.boolean(),
  disabled: z.boolean(),

  venueId: z.string(),
  contestId: z.string(),
  token: z.string().nullable(),

  participationWindow: z
    .strictObject({
      start: z.coerce.date(),
      end: z.coerce.date(),
    })
    .nullable(),

  variantId: z.string(),
  answers: z.record(z.string(), answerSchema),
  score: z.number().nullable(),
  extraData: z.record(z.string(), z.any()).optional(),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});

export type Student = z.infer<typeof studentSchema>;
