import z from "zod";

export const variantSchema = z.object({
  id: z.string(),
  schema: z.record(
    z.object({
      id: z.string(),
      index: z.number(),
      type: z.enum(["text", "number"]),
      regex: z.instanceof(RegExp).optional(),
      options: z.string().array().nonempty().optional(),
      blankOption: z.string().optional(),
      pointsCorrect: z.number().optional(),
      pointsBlank: z.number().optional(),
      pointsWrong: z.number().optional(),
    }),
  ),
  statement: z.instanceof(Uint8Array).optional(),
  contest: z.string(),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export type VariantMapping = z.infer<typeof variantMappingSchema>;
