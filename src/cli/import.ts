import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { parse } from "csv";
import { cert, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import z from "zod";

import { contestConverter, schoolConverter, variantConverter } from "~/firebase/converters";
import { contestSchema } from "~/models/contest";
import { schoolSchema } from "~/models/school";
import { teacherSchema as baseTeacherSchema } from "~/models/teacher";
import { variantSchema } from "~/models/variant";
import validate from "~/utils/validate";

const teacherSchema = baseTeacherSchema.omit({ id: true }).extend({
  externalId: z.coerce.number().optional(),
  email: z.string().email(),
  password: z.string(),
});

type Teacher = z.infer<typeof teacherSchema>;

type ImportOptions = {
  teachers?: boolean;
  schools?: boolean;
  contests?: boolean;
  variants?: boolean;
  all?: boolean;
};

export default async function importContests(options: ImportOptions) {
  const serviceAccount = JSON.parse(await readFile("serviceAccountKey.json", "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const auth = getAuth();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  if (options.all || options.contests) {
    console.log("Importing contests...");
    await pipeline(
      createReadStream("data/contests.csv"),
      parse({ columns: true }),
      async function (source) {
        const promises: Promise<any>[] = [];

        for await (const record of source) {
          const contest = validate(contestSchema, record);
          promises.push(
            db.doc(`contests/${contest.id}`).withConverter(contestConverter).set(contest),
          );
        }

        await Promise.all(promises);
        console.log(`${promises.length} contests imported!`);
      },
    );
  }

  if (options.all || options.variants) {
    console.log("Importing variants...");
    const variants = JSON.parse(await readFile("data/variants.json", "utf-8"));

    const promises: Promise<any>[] = [];

    for (const [id, record] of Object.entries(variants)) {
      const variant = validate(variantSchema, { id, ...record });
      promises.push(db.doc(`variants/${id}`).withConverter(variantConverter).set(variant));
    }

    await Promise.all(promises);
    console.log(`${promises.length} variants imported!`);
  }

  if (options.all || options.teachers) {
    console.log("Importing teachers...");
    await pipeline(
      createReadStream("data/teachers.csv"),
      parse({ columns: true }),
      async function (source) {
        const promises: Promise<void>[] = [];

        for await (const record of source) {
          const teacher = validate(teacherSchema, record);
          promises.push(importTeacher(auth, db, teacher));
        }

        await Promise.all(promises);
        console.log(`${promises.length} teachers imported!`);
      },
    );
  }

  if (options.all || options.schools) {
    console.log("Importing schools...");
    const schools = JSON.parse(await readFile("data/schools.json", "utf-8"));

    const promises: Promise<any>[] = [];

    for (const [id, record] of Object.entries(schools)) {
      const school = validate(schoolSchema, record);
      promises.push(db.doc(`schools/${id}`).withConverter(schoolConverter).set(school));
    }

    await Promise.all(promises);
    console.log(`${promises.length} schools imported!`);
  }

  console.log("All done!");
}

async function importTeacher(auth: Auth, db: Firestore, teacher: Teacher) {
  let user;
  try {
    const prevUser = await auth.getUserByEmail(teacher.email);
    user = await auth.updateUser(prevUser.uid, {
      emailVerified: true,
      password: teacher.password,
      displayName: teacher.name,
      disabled: false,
    });
  } catch (e) {
    user = await auth.createUser({
      email: teacher.email,
      emailVerified: true,
      password: teacher.password,
      displayName: teacher.name,
      disabled: false,
    });
  }

  await db.doc(`teachers/${user.uid}`).set({
    externalId: teacher.externalId,
    school: teacher.school,
  });
}
