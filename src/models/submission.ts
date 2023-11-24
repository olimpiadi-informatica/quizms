import z from "zod";

export const submissionSchema = z.object({
  uid: z.string(),
  answers: z.record(z.union([z.number(), z.string()])),
  timestamp: z.date().optional(),
});

export type Submission = z.infer<typeof submissionSchema>;
