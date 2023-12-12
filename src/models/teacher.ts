import z from "zod";

export const teacherSchema = z.object({
  id: z.string(),
});

export type Teacher = z.infer<typeof teacherSchema>;
