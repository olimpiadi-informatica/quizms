import z from "zod";

export const studentLoginSchema = z.object({
  action: z.literal("studentLogin"),
  contestId: z.string(),
  token: z.string(),
  userData: z.record(z.coerce.string()),
  extraData: z.record(z.any()),
});
export type StudentLogin = z.infer<typeof studentLoginSchema>;

export const adminLoginSchema = z.object({
  action: z.literal("adminLogin"),
  username: z.string(),
  password: z.string(),
});
export type AdminLogin = z.infer<typeof adminLoginSchema>;

export const teacherLoginSchema = z.object({
  action: z.literal("teacherLogin"),
  username: z.string(),
  password: z.string(),
});
export type TeacherLogin = z.infer<typeof teacherLoginSchema>;

export const teacherStartParticipationSchema = z.object({
  action: z.literal("teacherStartParticipation"),
  participationId: z.string(),
});
export type TeacherStartParticipation = z.infer<typeof teacherStartParticipationSchema>;

export const teacherStopParticipationSchema = z.object({
  action: z.literal("teacherStopParticipation"),
  participationId: z.string(),
});
export type TeacherStopParticipation = z.infer<typeof teacherStopParticipationSchema>;

export const teacherFinalizeParticipationSchema = z.object({
  action: z.literal("teacherFinalizeParticipation"),
  participationId: z.string(),
});
export type TeacherFinalizeParticipation = z.infer<typeof teacherFinalizeParticipationSchema>;

export const apiRequestSchema = z.discriminatedUnion("action", [
  studentLoginSchema,
  teacherLoginSchema,
  teacherStartParticipationSchema,
  teacherStopParticipationSchema,
  teacherFinalizeParticipationSchema,
]);

export type ApiRequest = z.infer<typeof apiRequestSchema>;
