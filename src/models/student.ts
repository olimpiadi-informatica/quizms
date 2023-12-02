import z from "zod";

export const studentSchema = z
  .object({
    personalInformation: z.record(z.union([z.string(), z.number(), z.date()]).optional()),
    contest: z.string(),
    school: z.string(),
    token: z.string(),

    variant: z.string(),
    disabled: z.boolean().default(false),
    answers: z.array(z.string().optional()),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;
