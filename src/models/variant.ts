import z from "zod";

export const variantSchema = z.object({
  id: z.string(),
  schema: z
    .object({
      type: z.enum(["text", "number"]),
      regex: z.instanceof(RegExp).optional(),
      options: z.string().array().nonempty().optional(),
      pointsCorrect: z.number().optional(),
      pointsBlank: z.number().optional(),
      pointsWrong: z.number().optional(),
    })
    .array(),
  statement: z.instanceof(Uint8Array).optional(),
  contest: z.string(),
});

export type Variant = z.infer<typeof variantSchema>;
