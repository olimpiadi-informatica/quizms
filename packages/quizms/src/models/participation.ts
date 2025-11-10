import z from "zod";

export const participationSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  contestId: z.string(),
  name: z.string(),
  teacher: z.string(),
  token: z.string().optional(),
  startingTime: z.date().optional(),
  endingTime: z.date().optional(),
  finalized: z.boolean().default(false),
  pdfVariants: z.array(z.coerce.string()).optional(),
  disabled: z.boolean().default(false),
});

export type Participation = z.infer<typeof participationSchema>;
