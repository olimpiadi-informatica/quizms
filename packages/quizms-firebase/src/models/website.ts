import z from "zod";

export const websiteSchema = z.strictObject({
  id: z.string(),
  origin: z.string(),
  title: z.string(),
  contests: z.string().array(),
});

export type Website = z.infer<typeof websiteSchema>;
