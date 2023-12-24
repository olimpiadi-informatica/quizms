import z from "zod";

import { zodBytes } from "~/models/types";

export const statementSchema = z.object({
  id: z.string(),
  statement: z.string(),
});

export type Statement = z.infer<typeof statementSchema>;

export const pdfSchema = z.object({
  id: z.string(),
  statement: zodBytes(),
});

export type Pdf = z.infer<typeof pdfSchema>;
