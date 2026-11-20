import z from "zod";

import { languageCodeRegex } from "~/utils/languages";

export const variantsConfigSchema = z.strictObject({
  id: z.string(),
  secret: z.string(),
  entry: z.string(),
  header: z.string().optional(),
  variantIds: z.coerce.string().array(),
  pdfVariantIds: z.coerce.string().array(),
  shuffleProblems: z.boolean(),
  shuffleAnswers: z.boolean(),
  pdfPerSchool: z.number(),
  // Statement languages; the first one is the default
  languages: z.string().regex(languageCodeRegex).array().nonempty().default(["it"]),
});

export type VariantsConfig = z.infer<typeof variantsConfigSchema>;
