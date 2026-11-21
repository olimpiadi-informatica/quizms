import { studentSchema } from "@olinfo/quizms/models";
import z from "zod";

export const submissionSchema = z.strictObject({
  id: z.string(),
  authType: z.string(),
  authId: z.string().optional(),
  studentId: z.string(),
  student: studentSchema,
  submittedAt: z.iso.datetime(),
});
