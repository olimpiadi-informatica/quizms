import {
  contestSchema,
  participationSchema,
  studentSchema,
  variantSchema,
} from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import {
  type DocumentSnapshot,
  type FirestoreDataConverter,
  Timestamp,
} from "firebase-admin/firestore";
import { cloneDeepWith, isDate, isString, mapValues, omit } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodUnion,
} from "zod";

import { userSchema } from "~/models/user";
import { websiteSchema } from "~/models/website";

function convertToFirestore(data: Record<string, any>) {
  return cloneDeepWith(omit(data, "id"), (value) => {
    if (isDate(value)) {
      return Timestamp.fromDate(value);
    }
    if (isString(value)) {
      return value.trim();
    }
    if (value === undefined) {
      return null;
    }
  });
}

function toFirebaseSchema(schema: z.core.$ZodType): z.core.$ZodType {
  if (schema instanceof ZodDate) {
    return z.pipe(
      z.instanceof(Timestamp).transform((ts) => ts.toDate()),
      schema,
    );
  }
  if (schema instanceof ZodObject) {
    return z.object(mapValues(schema.shape, (field) => toFirebaseSchema(field)));
  }
  if (schema instanceof ZodRecord) {
    return z.record(schema.keyType, toFirebaseSchema(schema.valueType));
  }
  if (schema instanceof ZodArray) {
    return z.array(toFirebaseSchema(schema.element));
  }
  if (schema instanceof ZodOptional) {
    return z.optional(z.preprocess((val) => val ?? undefined, toFirebaseSchema(schema.unwrap())));
  }
  if (schema instanceof ZodDefault) {
    return z.pipe(toFirebaseSchema(schema.unwrap()), schema);
  }
  if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
    return z.union(schema.options.map((option) => toFirebaseSchema(option)));
  }
  return schema;
}

function parse<T>(schema: z.core.$ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data(), id: snapshot.id };
  return validate(toFirebaseSchema(schema), data) as T;
}

function converter<T extends object>(schema: z.core.$ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => convertToFirestore(data),
    fromFirestore: (snapshot) => parse(schema, snapshot),
  };
}

export const contestConverter = converter(contestSchema);
export const participationConverter = converter(participationSchema);
export const studentConverter = converter(studentSchema);
export const userConverter = converter(userSchema);
export const variantConverter = converter(variantSchema);
export const websiteConverter = converter(websiteSchema);
