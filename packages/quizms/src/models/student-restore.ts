import z from "zod";

export const studentRestoreSchema = z.strictObject({
  id: z.string(),
  studentId: z.string(),
  participationId: z.string(),
  token: z.string(),
  name: z.string(),
  surname: z.string(),
  approvalCode: z.number(),
  status: z.enum(["pending", "approved", "revoked"]),
  createdAt: z.date(),
});

export type StudentRestore = z.infer<typeof studentRestoreSchema>;
