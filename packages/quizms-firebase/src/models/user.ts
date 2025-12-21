import z from "zod";

export const userSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  password: z.string(),
  role: z.enum(["admin", "teacher"]),
});

export type User = z.infer<typeof userSchema>;
