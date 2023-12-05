import z from "zod";

export const schoolSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  name: z.string(),
  teacher: z.string(),
  token: z.string().optional(),
  startingTime: z.date().optional(),
  variants: z.record(z.string()).optional(),
  finalized: z.boolean().optional().default(false),
});

export type School = z.infer<typeof schoolSchema>;
