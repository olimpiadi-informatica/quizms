import z from "zod";

export const announcementSchema = z.strictObject({
  id: z.string(),
  createdAt: z.date(),
  contestIds: z.string().array(),
  level: z.enum(["info", "warning", "error"]),
  title: z.string(),
  body: z.string(),
});

export type Announcement = z.infer<typeof announcementSchema>;
