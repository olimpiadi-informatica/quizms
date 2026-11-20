// Helpers shared by the `*.emulator.test.ts` files. Not part of the build.
import {
  type Contest,
  contestSchema,
  type Student,
  studentSchema,
  type Variant,
  type Venue,
  variantSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import type { Firestore } from "firebase-admin/firestore";

import {
  contestConverter,
  studentConverter,
  userConverter,
  variantConverter,
  venueConverter,
} from "~/cli/utils/converters-admin";
import { type User, userSchema } from "~/models/user";

export const PROJECT_ID = "demo-quizms";

function emulatorHost() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error("FIRESTORE_EMULATOR_HOST is not set");
  return host;
}

/** Deletes every document in the Firestore emulator. */
export async function clearFirestore() {
  const resp = await fetch(
    `http://${emulatorHost()}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!resp.ok) throw new Error(`Failed to clear Firestore: ${resp.status}`);
}

/** Decodes the claims of a custom token (the Auth emulator returns unsigned JWTs). */
export function decodeCustomToken(token: string): {
  uid: string;
  claims: Record<string, any>;
} {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return { uid: payload.uid, claims: payload.claims ?? {} };
}

export function makeContest(data: Partial<Contest> & { id: string }): Contest {
  return contestSchema.parse({
    name: "Test",
    longName: "Test contest",
    problemIds: ["1", "2"],
    userData: [
      { name: "surname", label: "Cognome", type: "text" },
      { name: "name", label: "Nome", type: "text" },
    ],
    matchingRules: [],
    hasVariants: true,
    hasOffline: false,
    scoreVisibility: "never",
    ...data,
  });
}

export function makeVenue(data: Partial<Venue> & { id: string }): Venue {
  return venueSchema.parse({
    schoolId: "school",
    contestId: "contest",
    name: "Venue",
    ...data,
  });
}

export function makeVariant(data: Partial<Variant> & { id: string }): Variant {
  return variantSchema.parse({
    isOnline: true,
    isPdf: false,
    contestId: "contest",
    schema: {
      "1": {
        type: "openNumber",
        correct: [42],
        pointsCorrect: 5,
        pointsBlank: 1,
        pointsWrong: 0,
        originalId: "1",
      },
      "2": {
        type: "multipleChoice",
        options: [
          { id: "A", correct: false, originalId: "A" },
          { id: "B", correct: true, originalId: "B" },
        ],
        pointsCorrect: 3,
        pointsBlank: 0,
        pointsWrong: -1,
        originalId: "2",
      },
    },
    ...data,
  });
}

export function makeStudent(data: Partial<Student> & { id: string }): Student {
  return studentSchema.parse({
    uid: `uid-${data.id}`,
    userData: { name: "Mario", surname: "Rossi" },
    userDataHash: "hash",
    absent: false,
    disabled: false,
    venueId: "venue",
    contestId: "contest",
    variantId: "v1",
    answers: {},
    extraData: {},
    ...data,
  });
}

export function makeUser(data: Partial<User> & { id: string }): User {
  return userSchema.parse({
    name: data.id,
    username: data.id,
    password: "password",
    role: "teacher",
    ...data,
  });
}

export async function seed(
  db: Firestore,
  data: {
    contests?: Contest[];
    venues?: Venue[];
    variants?: Variant[];
    students?: Student[];
    users?: User[];
  },
) {
  const batch = db.batch();
  for (const contest of data.contests ?? []) {
    batch.set(db.doc(`contests/${contest.id}`).withConverter(contestConverter), contest);
  }
  for (const venue of data.venues ?? []) {
    batch.set(db.doc(`venues/${venue.id}`).withConverter(venueConverter), venue);
  }
  for (const variant of data.variants ?? []) {
    batch.set(db.doc(`variants/${variant.id}`).withConverter(variantConverter), variant);
  }
  for (const student of data.students ?? []) {
    batch.set(
      db.doc(`venues/${student.venueId}/students/${student.id}`).withConverter(studentConverter),
      student,
    );
  }
  for (const user of data.users ?? []) {
    batch.set(db.doc(`users/${user.id}`).withConverter(userConverter), user);
  }
  await batch.commit();
}
