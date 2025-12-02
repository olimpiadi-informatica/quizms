import z from "zod";

export const websiteSchema = z.object({
  id: z.string(),
  origin: z.string(),
  title: z.string(),
  contests: z.string().array(),
});

export type Website = z.infer<typeof websiteSchema>;
