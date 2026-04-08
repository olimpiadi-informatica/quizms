import { studentSchema as baseStudentSchema } from "@olinfo/quizms/models";
import z from "zod";

export const studentSchema = baseStudentSchema.extend({
  userDataHash: z.string(),
});

export type Student = z.infer<typeof studentSchema>;
