import { sha256 } from "@noble/hashes/sha256";
import z from "zod";

export const studentSchema = z
  .object({
    uid: z.string(),
    personalInformation: z.record(z.union([z.string(), z.number(), z.date()]).optional()),

    absent: z.boolean(),
    disabled: z.boolean(),

    participationId: z.string(),
    contestId: z.string(),
    token: z.string(),
    startedAt: z.date(),
    finishedAt: z.date(),

    variant: z.string(),
    answers: z.record(z.union([z.string(), z.number(), z.null()])), // null means blank
    score: z.number(),
    maxScore: z.number(),
    extraData: z.record(z.any()),

    createdAt: z.coerce.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;

export function studentHash(student: Student) {
  const joined = [
    student.personalInformation?.name,
    student.personalInformation?.surname,
    student.personalInformation?.classYear,
    student.personalInformation?.classSection,
    student.token,
  ]
    .join("$")
    .toLowerCase();

  return Array.from(sha256(joined), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24)
    .toUpperCase();
}

export const studentMappingHashSchema = z.object({
  id: z.string(),
  studentId: z.string(),
});

export type StudentMappingHash = z.infer<typeof studentMappingHashSchema>;

export const studentMappingUidSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  participationId: z.string(),
});

export type StudentMappingUid = z.infer<typeof studentMappingUidSchema>;

export const studentRestoreSchema = z.object({
  id: z.string(), // uid identificativo della sessione
  studentId: z.string(), // identificativo dello studente a cui ci si vuole loggare
  participationId: z.string(), // identificativo della partecipazione
  token: z.string(),
  name: z.string(), // nome dello studente
  surname: z.string(), // cognome dello studente
});
export type StudentRestore = z.infer<typeof studentRestoreSchema>;
