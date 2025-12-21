import {
  type Announcement,
  announcementSchema,
  contestSchema,
  participationSchema,
  type Student,
  studentRestoreSchema,
  studentSchema,
  variantSchema,
} from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import {
  type DocumentSnapshot,
  type FirestoreDataConverter,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { cloneDeepWith, isDate, isString, mapValues, omit } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodUnion,
} from "zod";

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
    return z.preprocess((val) => val ?? undefined, z.optional(toFirebaseSchema(schema.unwrap())));
  }
  if (schema instanceof ZodDefault) {
    return z.pipe(toFirebaseSchema(schema.unwrap()), schema);
  }
  if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
    return z.union(schema.options.map((option) => toFirebaseSchema(option)));
  }
  if (schema instanceof ZodIntersection) {
    return z.intersection(toFirebaseSchema(schema.def.left), toFirebaseSchema(schema.def.right));
  }
  return schema;
}

function parse<T>(schema: z.core.$ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data({ serverTimestamps: "estimate" }), id: snapshot.id };
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
export const studentRestoreConvert = converter(studentRestoreSchema);
export const variantConverter = converter(variantSchema);
export const websiteConverter = converter(websiteSchema);

export const announcementConverter: FirestoreDataConverter<Announcement> = {
  toFirestore(data) {
    return {
      ...convertToFirestore(data),
      createdAt: serverTimestamp(),
    };
  },
  fromFirestore: (snapshot) => parse(announcementSchema, snapshot),
};

export const studentConverter: FirestoreDataConverter<Student> = {
  toFirestore(data) {
    return {
      ...convertToFirestore(data),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore: (snapshot) => parse(studentSchema, snapshot),
};
