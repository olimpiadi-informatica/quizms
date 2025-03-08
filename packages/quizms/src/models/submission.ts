import z from "zod";

import { studentSchema } from "./student";

export const submissionSchema = z.object({
  id: z.string(),
  uid: z.string(),
  student: studentSchema,
  submittedAt: z.date().optional(),
});

export type Submission = z.infer<typeof submissionSchema>;
