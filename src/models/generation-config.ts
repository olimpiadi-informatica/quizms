import z from "zod";

import { contestSchema } from "./contest";

export const generationConfigSchema = contestSchema.extend({
  longName: z.string().optional(),
  secret: z.string(),
  entry: z.string(),
  shuffleProblems: z.boolean(),
  shuffleAnswers: z.boolean(),
  variantIds: z.coerce.string().array(),
  pdfVariantIds: z.coerce.string().array(),
  pdfPerSchool: z.number(),
});

export type GenerationConfig = z.infer<typeof generationConfigSchema>;
