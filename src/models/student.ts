import z from "zod";

export const studentSchema = z
  .object({
    name: z.string(),
    surname: z.string(),
    classYear: z.coerce.number(),
    classSection: z.string(),
    birthDate: z.date(),
    contest: z.string(),
    token: z.string(),
    variant: z.string(),
    disabled: z.boolean().default(false),

    school: z.string(),

    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;
