import { readFile } from "node:fs/promises";
import { cwd } from "node:process";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { range } from "lodash-es";
import z, { ZodType } from "zod";

import { exportVariants } from "~/cli/export-variants";
import loadGenerationConfig from "~/cli/load-generation-config";
import {
  contestConverter,
  schoolConverter,
  solutionConverter,
  variantConverter,
  variantMappingConverter,
} from "~/firebase/convertersAdmin";
import { contestSchema } from "~/models/contest";
import { schoolSchema } from "~/models/school";
import { solutionSchema } from "~/models/solution";
import { variantSchema } from "~/models/variant";
import validate from "~/utils/validate";

type ImportOptions = {
  config: string;
  users?: boolean;
  schools?: boolean;
  contests?: boolean;
  variants?: boolean;
  solutions?: boolean;
  all?: boolean;
};

export default async function importContests(options: ImportOptions) {
  const config = await loadGenerationConfig(options.config);

  const serviceAccount = JSON.parse(await readFile("serviceAccountKey.json", "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const auth = getAuth();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  if (options.all || options.contests) {
    console.info("Importing contests...");
    const contests = JSON.parse(await readFile("data/contests.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(contests).map(async ([id, record]) => {
        const contest = validateOrExit(contestSchema, record, { id });
        await db.doc(`contests/${contest.id}`).withConverter(contestConverter).set(contest);
      }),
    );
    console.info(`${res.length} contests imported!`);
  }

  if (options.all || options.users) {
    console.info("Importing users...");
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
    console.info(`${res.length} users imported!`);
  }

  if (options.all || options.schools) {
    console.info("Importing schools...");
    const schools = JSON.parse(await readFile("data/schools.json", "utf-8"));

    const res = await Promise.all(
      schools.map(async (record: any) => {
        const school = validateOrExit(schoolSchema.omit({ id: true }), record);
        const user = await auth.getUserByEmail(school.teacher);
        await db
          .collection("schools")
          .withConverter(schoolConverter)
          .add({
            id: "",
            ...school,
            teacher: user.uid,
          });
      }),
    );
    console.info(`${res.length} schools imported!`);
  }

  console.log(config);
  if (options.all || options.variants || options.solutions) {
    for (const [contestId, contest] of Object.entries(config)) {
      const { solutions, variants } = await exportVariants(cwd(), contest);

      if (options.all || options.variants) {
        console.info("Importing variants...");

        const res = await Promise.all(
          Object.entries(variants).map(async ([id, record]) => {
            const variant = validateOrExit(variantSchema, record, { id });
            await db.doc(`variants/${id}`).withConverter(variantConverter).set(variant);
          }),
        );
        console.info(`${res.length} variants imported!`);

        const prefix = contestId;
        const res2 = await Promise.all(
          range(4096).map(async (i) => {
            const suffix = Buffer.from([i / 256, i % 256])
              .toString("hex")
              .slice(1)
              .toUpperCase();
            const id = `${prefix}-${suffix}`;
            await db.doc(`variantMapping/${id}`).withConverter(variantMappingConverter).set({
              id,
              variant: "0" /* TODO: randomizzare questa variabile */,
            });
          }),
        );
        console.info(`${res2.length} variant mappings imported!`);
      }

      if (options.all || options.solutions) {
        console.info("Importing solutions...");
        const res = await Promise.all(
          Object.entries(solutions).map(async ([id, record]) => {
            const variant = validateOrExit(solutionSchema, record, { id });
            await db.doc(`solutions/${id}`).withConverter(solutionConverter).set(variant);
          }),
        );
        console.info(`${res.length} solutions imported!`);
      }
    }
  }

  console.info("All done!");
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
