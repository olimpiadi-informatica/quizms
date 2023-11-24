import z from "zod";

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string().optional(),
  startingTime: z.date().optional(),
});

export type School = z.infer<typeof schoolSchema>;
