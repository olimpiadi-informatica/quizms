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
import { cloneDeepWith, isDate, isString, omit } from "lodash-es";
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
  });
}

function convertFromFirestore(data: object) {
  return cloneDeepWith(data, (value) => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
  });
}

export function parseSnapshot<T>(schema: z.core.$ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = convertFromFirestore({ ...snapshot.data(), id: snapshot.id });
  return validate(schema, data);
}

function converter<T extends object>(schema: z.core.$ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => convertToFirestore(data),
    fromFirestore: (snapshot) => parseSnapshot(schema, snapshot),
  };
}

export const contestConverter = converter(contestSchema);
export const participationConverter = converter(participationSchema);
export const studentConverter = converter(studentSchema);
export const submissionConverter = converter(submissionSchema);
export const userConverter = converter(userSchema);
export const variantConverter = converter(variantSchema);
export const websiteConverter = converter(websiteSchema);
