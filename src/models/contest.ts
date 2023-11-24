import z from "zod";

export const contestSchema = z.object({
  id: z.string(),
  name: z.string(),
  questionCount: z.coerce.number().int().positive(),
  startingWindowStart: z.date().optional(),
  startingWindowEnd: z.date().optional(),
  duration: z.number().optional(),
  allowStudents: z.boolean().optional(),
  allowRestart: z.boolean().optional(),
});

export type Contest = z.infer<typeof contestSchema>;
