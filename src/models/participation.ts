import z from "zod";

export const participationSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  contestId: z.string(),
  name: z.string(),
  teacher: z.string(),
  token: z.string().optional(),
  startingTime: z.date().optional(),
  finalized: z.boolean().default(false),
  pdfVariants: z.array(z.coerce.string()).optional(),
});

export type Participation = z.infer<typeof participationSchema>;

export const participationMappingSchema = z.object({
  id: z.string(),
  participationId: z.string(),
  contestId: z.string(),
  startingTime: z.date(),
});

export type ParticipationMapping = z.infer<typeof participationMappingSchema>;
