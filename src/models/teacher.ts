import z from "zod";

export const teacherSchema = z.object({
  name: z.string(),
  school: z.string(),
});

export type Teacher = z.infer<typeof teacherSchema>;
