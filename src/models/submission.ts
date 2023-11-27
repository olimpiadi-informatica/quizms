import z from "zod";

export const submissionSchema = z.object({
  id: z.string(),
  uid: z.string(),
  answers: z.string().array(),
  submittedAt: z.date().optional(),
});

export type Submission = z.infer<typeof submissionSchema>;
