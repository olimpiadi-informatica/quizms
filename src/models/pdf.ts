import z from "zod";

import { zodBytes } from "~/models/types";

export const pdfSchema = z.object({
  id: z.string(),
  statement: zodBytes(),
});

export type Pdf = z.infer<typeof pdfSchema>;
