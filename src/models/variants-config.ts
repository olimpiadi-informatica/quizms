import z from "zod";

export const variantsConfigSchema = z.object({
  id: z.string(),
  secret: z.string(),
  entry: z.string(),
  shuffleProblems: z.boolean(),
  shuffleAnswers: z.boolean(),
  variantIds: z.coerce.string().array(),
  pdfVariantIds: z.coerce.string().array(),
  pdfPerSchool: z.number(),
});

export type VariantsConfig = z.infer<typeof variantsConfigSchema>;
