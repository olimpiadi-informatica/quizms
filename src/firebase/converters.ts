import { Bytes, FirestoreDataConverter, Timestamp, serverTimestamp } from "firebase/firestore";
import { cloneDeepWith, mapValues } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodTypeAny,
} from "zod";

import { Contest, contestSchema } from "~/models/contest";
import { School, schoolSchema } from "~/models/school";
import { Student, studentSchema } from "~/models/student";
import { Submission, submissionSchema } from "~/models/submission";
import { Variant, variantSchema } from "~/models/variant";

function convertToFirestore(data: object) {
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
  });
}

function toFirebaseSchema(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodDate) {
    return z
      .instanceof(Timestamp)
      .transform((ts) => ts.toDate())
      .pipe(schema);
  }
  // TODO: bytes
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
    return toFirebaseSchema(schema.unwrap()).optional();
  }
  if (schema instanceof ZodNullable) {
    return toFirebaseSchema(schema.unwrap()).nullable();
  }
  return schema;
}

export const contestConverter: FirestoreDataConverter<Contest> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return toFirebaseSchema(contestSchema).parse(snapshot.data());
  },
};

export const schoolConverter: FirestoreDataConverter<School> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return toFirebaseSchema(schoolSchema).parse(snapshot.data());
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
    return toFirebaseSchema(studentSchema).parse(snapshot.data());
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
    return toFirebaseSchema(submissionSchema).parse(snapshot.data());
  },
};

export const teacherConverter: FirestoreDataConverter<{ school: string }> = {
  toFirestore: (data) => data,
  fromFirestore(snapshot) {
    return z.object({ school: z.string() }).parse(snapshot.data());
  },
};

export const variantConverter: FirestoreDataConverter<Variant> = {
  toFirestore: (data) => convertToFirestore(data),
  fromFirestore(snapshot) {
    return toFirebaseSchema(variantSchema).parse(snapshot.data());
  },
};
