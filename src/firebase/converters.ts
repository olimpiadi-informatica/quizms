import { DocumentSnapshot } from "@firebase/firestore";
import { Bytes, FirestoreDataConverter, Timestamp, serverTimestamp } from "firebase/firestore";
import { cloneDeepWith, mapValues } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodType,
  ZodTypeAny,
} from "zod";

import { Contest, contestSchema } from "~/models/contest";
import { School, schoolSchema } from "~/models/school";
import { Student, studentSchema } from "~/models/student";
import { Submission, submissionSchema } from "~/models/submission";
import { Teacher, teacherSchema } from "~/models/teacher";
import { Variant, variantSchema } from "~/models/variant";
import validate from "~/utils/validate";

function convertToFirestore({ id, ...data }: Record<string, any>) {
  return cloneDeepWith(data, (value) => {
    if (value instanceof RegExp) {
      return value.source;
    }
    if (value instanceof Uint8Array) {
      return Bytes.fromUint8Array(value);
    }
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }
    if (value === undefined) {
      return null;
    }
  });
}

function toFirebaseSchemaField(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodDate) {
    return z
      .instanceof(Timestamp)
      .transform((ts) => ts.toDate())
      .pipe(schema);
  }
  // TODO: bytes
  // TODO: regex

  if (schema instanceof ZodObject) {
    return z.object(mapValues(schema.shape, (field) => toFirebaseSchemaField(field)));
  }
  if (schema instanceof ZodRecord) {
    return z.record(toFirebaseSchemaField(schema.element));
  }
  if (schema instanceof ZodArray) {
    return toFirebaseSchemaField(schema.element).array();
  }
  if (schema instanceof ZodOptional) {
    return toFirebaseSchemaField(schema.unwrap()).optional();
  }
  if (schema instanceof ZodNullable) {
    return toFirebaseSchemaField(schema.unwrap()).nullable();
  }
  return schema;
}

function parse<T>(schema: ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data(), id: snapshot.id };
  return validate(toFirebaseSchemaField(schema), data);
}

export const contestConverter: FirestoreDataConverter<Contest> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return parse(contestSchema, snapshot);
  },
};

export const schoolConverter: FirestoreDataConverter<School> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return parse(schoolSchema, snapshot);
  },
};

export const studentConverter: FirestoreDataConverter<Student> = {
  toFirestore(data) {
    return {
      ...convertToFirestore(data),
      createdAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot) {
    return parse(studentSchema, snapshot);
  },
};

export const submissionConverter: FirestoreDataConverter<Submission> = {
  toFirestore(data: Submission) {
    return {
      ...convertToFirestore(data),
      timestamp: serverTimestamp(),
    };
  },
  fromFirestore(snapshot) {
    return parse(submissionSchema, snapshot);
  },
};

export const teacherConverter: FirestoreDataConverter<Omit<Teacher, "name">> = {
  toFirestore: (data) => data,
  fromFirestore(snapshot) {
    return parse(teacherSchema.omit({ name: true }), snapshot);
  },
};

export const variantConverter: FirestoreDataConverter<Variant> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return parse(variantSchema, snapshot);
  },
};
