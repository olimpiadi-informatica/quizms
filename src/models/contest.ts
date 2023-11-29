import z from "zod";

export const contestSchema = z.object({
  id: z.string(),
  name: z.string(),
  questionCount: z.coerce.number().int().positive(),

  startingWindowStart: z.date().optional(),
  startingWindowEnd: z.date().optional(),
  duration: z.coerce.number().positive().optional(),

  personalInformation: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(["text", "number", "date"]),
      size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
      pinned: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
  ),
  hasVariants: z.boolean().default(true),
  allowStudentRegistration: z.boolean().default(false),
  allowRestart: z.boolean().default(false),

  instructions: z.string().optional(),
});

export type Contest = z.infer<typeof contestSchema>;
