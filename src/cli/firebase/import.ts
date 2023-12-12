import { readFile } from "node:fs/promises";
import { cwd } from "node:process";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Firestore, Query, getFirestore } from "firebase-admin/firestore";
import z, { ZodType } from "zod";

import { exportVariants } from "~/cli/export-variants";
import loadGenerationConfig from "~/cli/load-generation-config";
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
  config: string;
  users?: boolean;
  schools?: boolean;
  contests?: boolean;
  variants?: boolean;
  solutions?: boolean;
  delete?: boolean;
  all?: boolean;
};

async function deleteCollection(db: Firestore, collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(400);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db: Firestore, query: Query, resolve: () => void) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

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
    if (options.delete) {
      console.info("Deleting contests...");
      await deleteCollection(db, "contests");
      console.info("Deleted contests!");
    }
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
    if (options.delete) {
      console.info("Deleting users...");
      /* TODO boh non so come fare */
      console.info("Deleted users!");
    }
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
    if (options.delete) {
      console.info("Deleting schools...");
      await deleteCollection(db, "schools");
      console.info("Deleted schools!");
    }
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
    for (const contest of Object.values(config)) {
      if (options.delete) {
        console.info("Deleting variants...");
        await deleteCollection(db, "variants");
        console.info("Deleted variants!");
      }
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

        /*console.info("Importing variant mappings...");
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
              variant: "0" /* TODO: randomizzare questa variabile */ //,
        /*});
          }),
        );
        console.info(`${res2.length} variant mappings imported!`);*/
      }

      if (options.all || options.solutions) {
        if (options.delete) {
          console.info("Deleting solutions...");
          await deleteCollection(db, "solutions");
          console.info("Deleted solutions!");
        }
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
