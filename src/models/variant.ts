import z from "zod";

export const variantSchema = z.object({
  id: z.string(),
  contest: z.string(),
  schema: z.record(
    z.object({
      id: z.string(),
      type: z.enum(["text", "number"]),
      options: z.string().array().nonempty().optional(),
      blankOption: z.string().optional(),
      pointsCorrect: z.number().optional(),
      pointsBlank: z.number().optional(),
      pointsWrong: z.number().optional(),
    }),
  ),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = Variant["schema"];

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export type VariantMapping = z.infer<typeof variantMappingSchema>;
