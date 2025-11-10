import {
  type Announcement,
  announcementSchema,
  contestSchema,
  participationSchema,
  type Student,
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
  ZodObject,
  ZodOptional,
  ZodRecord,
  type ZodType,
  type ZodTypeAny,
  ZodUnion,
} from "zod";

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

function toFirebaseSchema(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodDate) {
    return z
      .instanceof(Timestamp)
      .transform((ts) => ts.toDate())
      .pipe(schema);
  }
  if (schema instanceof ZodObject) {
    return z.object(mapValues(schema.shape, (field) => toFirebaseSchema(field)));
  }
  if (schema instanceof ZodRecord) {
    return z.record(toFirebaseSchema(schema.element));
  }
  if (schema instanceof ZodArray) {
    return toFirebaseSchema(schema.element).array();
  }
  if (schema instanceof ZodOptional) {
    return z.preprocess((val) => val ?? undefined, toFirebaseSchema(schema.unwrap()).optional());
  }
  if (schema instanceof ZodDefault) {
    return toFirebaseSchema(schema.removeDefault()).pipe(schema);
  }
  if (schema instanceof ZodUnion) {
    return z.union(schema.options.map((option: ZodTypeAny) => toFirebaseSchema(option)));
  }
  if (schema instanceof ZodDiscriminatedUnion) {
    return z.discriminatedUnion(
      schema.discriminator,
      schema.options.map((option: ZodTypeAny) => toFirebaseSchema(option)),
    );
  }
  return schema;
}

function parse<T>(schema: ZodType<T, any, any>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data({ serverTimestamps: "estimate" }), id: snapshot.id };
  return validate(toFirebaseSchema(schema), data);
}

function converter<T extends object>(schema: ZodType<T, any, any>): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => convertToFirestore(data),
    fromFirestore: (snapshot) => parse(schema, snapshot),
  };
}

export const contestConverter = converter(contestSchema);
export const participationConverter = converter(participationSchema);
export const variantConverter = converter(variantSchema);

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
