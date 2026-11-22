import {
  announcementSchema,
  contestSchema,
  studentRestoreSchema,
  studentSchema,
  variantSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import type { DocumentSnapshot, FirestoreDataConverter } from "firebase/firestore";
import type z from "zod";

import { websiteSchema } from "~/models/website";
import { convertFromFirestore } from "~/utils/firestore";

function parse<T>(schema: z.core.$ZodType<T>, snapshot: DocumentSnapshot): T {
  const data = convertFromFirestore({ ...snapshot.data(), id: snapshot.id });
  return validate(schema, data);
}

/** Clients only read from Firestore: every write goes through the API. */
function converter<T extends object>(schema: z.core.$ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore: () => {
      throw new Error("Firestore is read-only for clients: use the API to write data");
    },
    fromFirestore: (snapshot) => parse(schema, snapshot),
  };
}

export const announcementConverter = converter(announcementSchema);
export const contestConverter = converter(contestSchema);
export const studentConverter = converter(studentSchema);
export const studentRestoreConvert = converter(studentRestoreSchema);
export const variantConverter = converter(variantSchema);
export const venueConverter = converter(venueSchema);
export const websiteConverter = converter(websiteSchema);
