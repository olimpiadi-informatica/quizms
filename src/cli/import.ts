import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { parse } from "csv";
import { cert, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import z from "zod";

import { ContestSchema, contestConverter } from "~/firebase/types/contest";
import { VariantSchema, variantConverter } from "~/firebase/types/variant";

const TeacherSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

type Teacher = z.infer<typeof TeacherSchema>;

export default async function importContests() {
  const serviceAccount = JSON.parse(await readFile("serviceAccountKey.json", "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const auth = getAuth();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  console.log("Importing contests...");
  await pipeline(
    createReadStream("contests.csv"),
    parse({ columns: true }),
    async function (source) {
      const promises: Promise<any>[] = [];

      for await (const record of source) {
        const contest = ContestSchema.parse(record);
        promises.push(
          db.doc(`contests/${contest.id}`).withConverter(contestConverter).set(contest),
        );
      }

      await Promise.all(promises);
      console.log(`${promises.length} contests imported!`);
    },
  );

  console.log("Importing variants...");
  {
    const variants = JSON.parse(await readFile("variants.json", "utf-8"));

    const promises: Promise<any>[] = [];

    for (const [id, record] of Object.entries(variants)) {
      const variant = VariantSchema.parse(record);
      promises.push(db.doc(`variants/${id}`).withConverter(variantConverter).set(variant));
    }

    await Promise.all(promises);
    console.log(`${promises.length} variants imported!`);
  }

  console.log("Importing teachers...");
  await pipeline(
    createReadStream("teachers.csv"),
    parse({ columns: true }),
    async function (source) {
      const promises: Promise<void>[] = [];

      for await (const record of source) {
        const teacher = TeacherSchema.parse(record);
        promises.push(importTeacher(auth, teacher));
      }

      await Promise.all(promises);
      console.log(`${promises.length} teachers imported!`);
    },
  );

  console.log("All done!");
}

async function importTeacher(auth: Auth, teacher: Teacher) {
  try {
    const prevUser = await auth.getUserByEmail(teacher.email);
    await auth.updateUser(prevUser.uid, {
      emailVerified: true,
      password: teacher.password,
      displayName: teacher.name,
      disabled: false,
    });
  } catch (e) {
    await auth.createUser({
      email: teacher.email,
      emailVerified: true,
      password: teacher.password,
      displayName: teacher.name,
      disabled: false,
    });
  }
}
