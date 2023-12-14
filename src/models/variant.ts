import z from "zod";

export const schemaSchema = z.record(
  z.object({
    id: z.string(),
    type: z.enum(["text", "number"]),
    regex: z.instanceof(RegExp).optional(),
    options: z.string().array().nonempty().optional(),
    blankOption: z.string().optional(),
    pointsCorrect: z.number().optional(),
    pointsBlank: z.number().optional(),
    pointsWrong: z.number().optional(),
  }),
);

export const schemaDocSchema = z.object({
  id: z.string(),
  schema: schemaSchema,
  contest: z.string(),
});

export const variantSchema = z.object({
  id: z.string(),
  schema: schemaSchema,
  statement: z.string(),
  contest: z.string(),
});

export type Variant = z.infer<typeof variantSchema>;
export type Schema = z.infer<typeof schemaSchema>;
export type SchemaDoc = z.infer<typeof schemaDocSchema>;

export const variantMappingSchema = z.object({ id: z.string(), variant: z.string() });

export type VariantMapping = z.infer<typeof variantMappingSchema>;
