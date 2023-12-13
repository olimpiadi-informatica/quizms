import z from "zod";

export const contestSchema = z.object({
  id: z.string(),
  name: z.string(),
  problemIds: z.coerce.string().array(),

  startingWindowStart: z.coerce.date().optional(),
  startingWindowEnd: z.coerce.date().optional(),
  duration: z.coerce.number().positive().optional(),

  personalInformation: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(["text", "number", "date"]),
      size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
      pinned: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
  ),
  hasVariants: z.boolean().default(true),
  allowStudentRegistration: z.boolean().default(false),
  allowRestart: z.boolean().default(false),

  instructions: z.string().optional(),
});

export type Contest = z.infer<typeof contestSchema>;

export function parsePersonalInformation(
  value: any,
  schema?: Contest["personalInformation"][number],
) {
  if (!schema) return value;
  switch (schema.type) {
    case "text":
      return value;
    case "number": {
      const unbounded = Number(value);
      if ((schema?.min ?? -Infinity) <= unbounded && unbounded <= (schema?.max ?? Infinity)) {
        return unbounded;
      }
      return;
    }
    case "date":
      return new Date(value);
  }
}
