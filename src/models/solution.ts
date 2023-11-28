import z from "zod";

export const solutionSchema = z.object({
  id: z.string(),
  answers: z.array(z.string()),
});

export type Solution = z.infer<typeof solutionSchema>;
