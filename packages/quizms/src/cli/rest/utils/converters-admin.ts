import { cloneDeepWith, isDate, isString, mapValues } from "lodash-es";
import {
  ZodDate,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodString,
  type ZodTypeAny,
  ZodUnion,
  z,
} from "zod";

export function convertToRest(data: Record<string, any>) {
  return cloneDeepWith(data, (value) => {
    if (isDate(value)) {
      return value.toString();
    }
    if (isString(value)) {
      return value;
    }
    if (value === undefined) {
      return null;
    }
  });
}

export function toRestSchema(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodDate) {
    return z.instanceof(ZodString);
  }
  if (schema instanceof ZodObject) {
    return z.object(mapValues(schema.shape, (field) => toRestSchema(field)));
  }
  if (schema instanceof ZodRecord) {
    return z.record(toRestSchema(schema.element));
  }
  if (schema instanceof ZodOptional) {
    return z.preprocess((val) => val ?? undefined, toRestSchema(schema.unwrap()).optional());
  }
  if (schema instanceof ZodDefault) {
    return toRestSchema(schema.removeDefault()).pipe(schema);
  }
  if (schema instanceof ZodUnion) {
    return z.union(schema.options.map((option: ZodTypeAny) => toRestSchema(option)));
  }
  if (schema instanceof ZodDiscriminatedUnion) {
    return z.discriminatedUnion(
      schema.discriminator,
      schema.options.map((option: ZodTypeAny) => toRestSchema(option)),
    );
  }
  return schema;
}
