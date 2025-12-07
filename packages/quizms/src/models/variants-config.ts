import z from "zod";

export const variantsConfigSchema = z.object({
  id: z.string(),
  secret: z.string(),
  entry: z.string(),
  header: z.string().optional(),
  variantIds: z.coerce.string().array(),
  pdfVariantIds: z.coerce.string().array(),
  shuffleProblems: z.boolean(),
  shuffleAnswers: z.boolean(),
  pdfPerSchool: z.number(),
});

export type VariantsConfig = z.infer<typeof variantsConfigSchema>;
