import z from "zod";

export const schoolSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  externalId: z.string().optional(),
  name: z.string(),
  teacher: z.string(),
  token: z.string().optional(),
  startingTime: z.date().optional(),
  variants: z.record(z.string()).optional(),
  finalized: z.boolean().optional().default(false),
  contestId: z.string(),
  pdfVariants: z.array(z.string()),
});

export type School = z.infer<typeof schoolSchema>;

export const schoolMappingSchema = z.object({
  id: z.string(),
  school: z.string(),
  contestId: z.string(),
  startingTime: z.date(),
});

export type SchoolMapping = z.infer<typeof schoolMappingSchema>;
