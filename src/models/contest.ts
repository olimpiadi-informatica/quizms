import z from "zod";

export const contestSchema = z.object({
  id: z.string(),
  name: z.string(),
  questionCount: z.coerce.number().int().positive(),
  startingWindowStart: z.date().optional(),
  startingWindowEnd: z.date().optional(),
  duration: z.coerce.number().positive().optional(),
  allowStudentRegistration: z.boolean().default(false),
  allowRestart: z.boolean().default(false),
});

export type Contest = z.infer<typeof contestSchema>;
