import z from "zod";

export const studentSchema = z
  .object({
    uid: z.string(),
    personalInformation: z.record(z.union([z.string(), z.number(), z.date()]).optional()),

    contest: z.string(),
    school: z.string(),
    token: z.string(),
    startedAt: z.date(),

    variant: z.string(),
    disabled: z.boolean().default(false),
    answers: z.record(z.string().optional()),

    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;

export const studentMappingHashSchema = z.object({
  id: z.string(),
  studentId: z.string(),
});

export type StudentMappingHash = z.infer<typeof studentMappingHashSchema>;

export const studentMappingUidSchema = z.object({
  id: z.string(),
  studentId: z.string(),
});

export type StudentMappingUid = z.infer<typeof studentMappingUidSchema>;

export const studentRestoreSchema = z.object({
  id: z.string(), // uid identificativo della sessione
  studentId: z.string(), // identificativo dello studente a cui ci si vuole loggare
  schoolId: z.string(), // scuola dello studente
  name: z.string(), // nome dello studente
  surname: z.string(), // cognome dello studente
});
export type StudentRestore = z.infer<typeof studentRestoreSchema>;
