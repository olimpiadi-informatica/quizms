import z from "zod";

import { answerSchema } from "~/models/variant";

export const studentSchema = z
  .object({
    uid: z.string(),
    userData: z.record(z.union([z.string(), z.number(), z.date()]).optional()),

    absent: z.boolean(),
    disabled: z.boolean(),

    participationId: z.string(),
    contestId: z.string(),
    token: z.string(),
    startedAt: z.date(),
    finishedAt: z.date(),

    variant: z.string(),
    answers: z.record(answerSchema),
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
  id: z.string(), // uid of the session
  studentId: z.string(), // id of the student to log in
  participationId: z.string(), // id of the participation
  token: z.string(),
  name: z.string(), // name of the student
  surname: z.string(), // surname of the student
});
export type StudentRestore = z.infer<typeof studentRestoreSchema>;
