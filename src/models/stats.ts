import { z } from "zod";

export const statsSchema = z.object({
  cols: z.array(z.record(z.string(), z.any())),
  rows: z.array(z.record(z.string(), z.any())),
});

export type Stats = z.infer<typeof statsSchema>;
