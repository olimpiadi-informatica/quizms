import z from "zod";

export const studentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    surname: z.string(),
    classYear: z.coerce.number(),
    classSection: z.string(),
    birthDate: z.date(),
    school: z.string(),
    contest: z.string(),
    token: z.string(),
    variant: z.string(),
    createdAt: z.date().optional(),
    disabled: z.boolean().default(false),
  })
  .partial();

export type Student = z.infer<typeof studentSchema>;
