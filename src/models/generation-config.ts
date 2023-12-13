import z from "zod";

export const generationConfigSchema = z.record(
  z.object({
    id: z.string(),
    name: z.string(),
    variantIds: z.coerce.string().array(),
    pdfVariantIds: z.coerce.string().array(),
    pdfPerSchool: z.number(),
    secret: z.string(),
    entry: z.string(),
    shuffleProblems: z.boolean(),
    shuffleAnswers: z.boolean(),
  }),
);

export type GenerationConfig = z.infer<typeof generationConfigSchema>;
export type ContestConfig = GenerationConfig[keyof GenerationConfig];
