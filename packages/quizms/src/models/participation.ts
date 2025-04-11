import z from "zod";

export const participationSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  contestId: z.string(),
  name: z.string(),
  teacher: z.string(),
  token: z.string().optional(),
  startingTime: z.coerce.date().optional(),
  endingTime: z.coerce.date().optional(),
  finalized: z.boolean().default(false),
  pdfVariants: z.array(z.coerce.string()).optional(),
  disabled: z.boolean().default(false),
});

export type Participation = z.infer<typeof participationSchema>;

export const participationMappingSchema = z.object({
  id: z.string(),
  participationId: z.string(),
  contestId: z.string(),
  startingTime: z.date(),
  endingTime: z.date(),
});

export type ParticipationMapping = z.infer<typeof participationMappingSchema>;

export const schoolSchema = participationSchema
  .omit({
    schoolId: true,
    teacher: true,
    contestId: true,
  })
  .extend({
    contestIds: z.union([z.string(), z.array(z.string())]).default("*"),
    password: z.string(),
  })
  .transform((school) => ({
    ...school,
    email: `${school.id.toLowerCase()}@teacher.edu`,
  }));

export type School = z.infer<typeof schoolSchema>;
