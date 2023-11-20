import { Bytes, FirestoreDataConverter } from "firebase/firestore";
import { mapValues } from "lodash-es";
import z from "zod";

export const VariantSchema = z.object({
  schema: z.record(
    z.object({
      type: z.enum(["closed", "text", "number", "score"]),
      regex: z
        .string()
        .optional()
        .transform((re) => (re ? new RegExp(re) : undefined)),
      pointsCorrect: z.number().optional(),
      pointsWrong: z.number().optional(),
      pointsBlank: z.number().optional(),
    }),
  ),
  statement: z
    .custom<Bytes>((value) => value instanceof Bytes)
    .optional()
    .transform((bytes) => bytes?.toUint8Array()),
  contest: z.string(),
});

export type Variant = z.infer<typeof VariantSchema>;

export const variantConverter: FirestoreDataConverter<Variant> = {
  toFirestore(data: Variant) {
    return {
      ...data,
      schema: mapValues(data.schema, (value) => ({
        ...value,
        regex: value.regex?.source,
      })),
      statement: data.statement && Bytes.fromUint8Array(data.statement),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return VariantSchema.parse(data);
  },
};
