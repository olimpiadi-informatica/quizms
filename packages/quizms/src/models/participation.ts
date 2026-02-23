import z from "zod";

export const participationSchema = z.strictObject({
  id: z.string(),
  schoolId: z.string(),
  contestId: z.string(),
  name: z.string(),
  token: z.string().nullish(),
  startingTime: z.date().nullish(),
  endingTime: z.date().nullish(),
  finalized: z.boolean().default(false),
  pdfVariants: z.array(z.coerce.string()).optional(),
  disabled: z.boolean().default(false),
});

export type Participation = z.infer<typeof participationSchema>;
