import { readFile } from "node:fs/promises";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import z, { ZodType } from "zod";

import {
  contestConverter,
  schoolConverter,
  solutionConverter,
  variantConverter,
} from "~/firebase/convertersAdmin";
import { contestSchema } from "~/models/contest";
import { schoolSchema } from "~/models/school";
import { solutionSchema } from "~/models/solution";
import { variantSchema } from "~/models/variant";
import validate from "~/utils/validate";

type ImportOptions = {
  users?: boolean;
  schools?: boolean;
  contests?: boolean;
  variants?: boolean;
  solutions?: boolean;
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
    const contests = JSON.parse(await readFile("data/contests.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(contests).map(async ([id, record]) => {
        const contest = validateOrExit(contestSchema, record, { id });
        await db.doc(`contests/${contest.id}`).withConverter(contestConverter).set(contest);
      }),
    );
    console.log(`${res.length} contests imported!`);
  }

  if (options.all || options.variants) {
    console.log("Importing variants...");
    const variants = JSON.parse(await readFile("data/variants.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(variants).map(async ([id, record]) => {
        const variant = validateOrExit(variantSchema, record, { id });
        await db.doc(`variants/${id}`).withConverter(variantConverter).set(variant);
      }),
    );
    console.log(`${res.length} variants imported!`);
  }

  if (options.all || options.users) {
    console.log("Importing users...");
    const teachers = JSON.parse(await readFile("data/users.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(teachers).map(async ([email, record]) => {
        const user = validateOrExit(userSchema, record, { email });

        const prevUser = await auth.getUserByEmail(user.email).catch(() => undefined);
        if (!prevUser) {
          await auth.createUser({
            email: user.email,
            emailVerified: true,
            password: user.password,
            displayName: user.name,
            disabled: false,
          });
        }
      }),
    );
    console.log(`${res.length} users imported!`);
  }

  if (options.all || options.schools) {
    console.log("Importing schools...");
    const schools = JSON.parse(await readFile("data/schools.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(schools).map(async ([id, record]) => {
        const school = validateOrExit(schoolSchema, record, { id });
        const user = await auth.getUserByEmail(school.teacher);
        await db
          .doc(`schools/${school.id}`)
          .withConverter(schoolConverter)
          .set({
            ...school,
            teacher: user.uid,
          });
      }),
    );
    console.log(`${res.length} schools imported!`);
  }

  if (options.all || options.solutions) {
    console.log("Importing solutions...");
    const variants = JSON.parse(await readFile("data/solutions.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(variants).map(async ([id, record]) => {
        const variant = validateOrExit(solutionSchema, record, { id });
        await db.doc(`solutions/${id}`).withConverter(solutionConverter).set(variant);
      }),
    );
    console.log(`${res.length} solutions imported!`);
  }

  console.log("All done!");
  await deleteApp(app);
}

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

function validateOrExit<In, Out, Extra extends In>(
  schema: ZodType<Out, any, In>,
  value: In,
  extra?: Extra,
): Out {
  try {
    return validate<any, Out>(
      z
        .record(z.any())
        .transform((record) => ({ ...extra, ...record }))
        .pipe(schema),
      value,
    );
  } catch (e) {
    process.exit(1);
  }
}
