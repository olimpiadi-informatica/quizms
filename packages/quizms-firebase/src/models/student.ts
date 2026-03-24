import { studentSchema as baseStudentSchema } from "@olinfo/quizms/models";
import z from "zod";

export const studentSchema = baseStudentSchema.extend({
  uid: z.string(),
  userDataHash: z.string(),
});

export type Student = z.infer<typeof studentSchema>;
