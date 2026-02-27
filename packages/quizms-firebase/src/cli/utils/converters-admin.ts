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
import { cloneDeepWith, isDate, isObject, isString, omit, transform } from "lodash-es";
import type z from "zod";

import { submissionSchema } from "~/models/submission";
import { userSchema } from "~/models/user";
import { websiteSchema } from "~/models/website";

function convertToFirestore(data: object) {
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

function convertFromFirestore(data: object) {
  return transform(data, (result: any, value: any, key: string | number) => {
    if (value === null) {
      result[key] = undefined;
    } else if (value instanceof Timestamp) {
      result[key] = value.toDate();
    } else if (isObject(value)) {
      result[key] = convertFromFirestore(value);
    } else {
      result[key] = value;
    }
  });
}

function parse<T>(schema: z.core.$ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = convertFromFirestore({ ...snapshot.data(), id: snapshot.id });
  return validate(schema, data);
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
export const submissionConverter = converter(submissionSchema);
export const userConverter = converter(userSchema);
export const variantConverter = converter(variantSchema);
export const websiteConverter = converter(websiteSchema);
