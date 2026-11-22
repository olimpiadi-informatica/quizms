import {
  announcementSchema,
  contestSchema,
  studentRestoreSchema,
  studentSchema,
  variantSchema,
  venueSchema,
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

// Duck-typed instead of `instanceof Timestamp`: the snapshots passed to Firestore triggers are
// created by the `firebase-admin` copy used by `firebase-functions`, which can differ from ours.
function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Timestamp).toDate === "function" &&
    typeof (value as Timestamp).seconds === "number" &&
    typeof (value as Timestamp).nanoseconds === "number"
  );
}

function convertFromFirestore(data: object) {
  return cloneDeepWith(data, (value) => {
    if (isTimestamp(value)) {
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

export const announcementConverter = converter(announcementSchema);
export const contestConverter = converter(contestSchema);
export const venueConverter = converter(venueSchema);
export const studentConverter = converter(studentSchema);
export const studentRestoreConverter = converter(studentRestoreSchema);
export const submissionConverter = converter(submissionSchema);
export const userConverter = converter(userSchema);
export const variantConverter = converter(variantSchema);
export const websiteConverter = converter(websiteSchema);
