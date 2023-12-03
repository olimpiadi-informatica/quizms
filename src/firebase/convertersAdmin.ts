import {
  DocumentSnapshot,
  FieldValue,
  FirestoreDataConverter,
  Timestamp,
} from "firebase-admin/firestore";
import { cloneDeepWith, mapValues, omit } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodDefault,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodType,
  ZodTypeAny,
  ZodUnion,
} from "zod";

import { Contest, contestSchema } from "~/models/contest";
import { School, schoolSchema } from "~/models/school";
import { Solution, solutionSchema } from "~/models/solution";
import { Student, studentSchema } from "~/models/student";
import { Submission, submissionSchema } from "~/models/submission";
import { Variant, variantSchema } from "~/models/variant";
import validate from "~/utils/validate";

function convertToFirestore(data: Record<string, any>) {
  return cloneDeepWith(omit(data, "id"), (value) => {
    if (value instanceof RegExp) {
      return value.source;
    }
    if (value instanceof Uint8Array) {
      return Buffer.from(value);
    }
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
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
  // TODO: Uint8Array
  // TODO: regex

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
    return toFirebaseSchema(schema.removeDefault().optional()).pipe(schema);
  }
  if (schema instanceof ZodUnion) {
    return z.union(schema.options.map((option: ZodTypeAny) => toFirebaseSchema(option)));
  }
  return schema;
}

function parse<T>(schema: ZodType<T, any, any>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data(), id: snapshot.id };
  return validate(toFirebaseSchema(schema), data);
}

export const contestConverter: FirestoreDataConverter<Contest> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore: (snapshot) => parse(contestSchema, snapshot),
};

export const schoolConverter: FirestoreDataConverter<School> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore: (snapshot) => parse(schoolSchema, snapshot),
};

export const solutionConverter: FirestoreDataConverter<Solution> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore: (snapshot) => parse(solutionSchema, snapshot),
};

export const studentConverter: FirestoreDataConverter<Student> = {
  toFirestore(data) {
    return {
      ...convertToFirestore(data),
      updatedAt: FieldValue.serverTimestamp(),
    };
  },
  fromFirestore: (snapshot) => parse(studentSchema, snapshot),
};

export const submissionConverter: FirestoreDataConverter<Submission> = {
  toFirestore(data: Submission) {
    return {
      ...convertToFirestore(data),
      submittedAt: FieldValue.serverTimestamp(),
    };
  },
  fromFirestore: (snapshot) => parse(submissionSchema, snapshot),
};

export const variantConverter: FirestoreDataConverter<Variant> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore: (snapshot) => parse(variantSchema, snapshot),
};
