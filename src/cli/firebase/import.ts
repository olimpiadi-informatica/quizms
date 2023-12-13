import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, Query, getFirestore } from "firebase-admin/firestore";
import { range } from "lodash-es";
import z, { ZodType } from "zod";

import { exportVariants } from "~/cli/export-variants";
import loadGenerationConfig from "~/cli/load-generation-config";
import {
  contestConverter,
  pdfConverter,
  schoolConverter,
  solutionConverter,
  teacherConverter,
  variantConverter,
  variantMappingConverter,
} from "~/firebase/convertersAdmin";
import { contestSchema } from "~/models/contest";
import { schoolSchema } from "~/models/school";
import { Rng } from "~/utils/random";
import validate from "~/utils/validate";

type ImportOptions = {
  config: string;
  users?: boolean;
  schools?: boolean;
  contests?: boolean;
  variants?: boolean;
  solutions?: boolean;
  delete?: boolean;
  pdfs?: boolean;
  all?: boolean;
};

async function getAllUsers(auth: Auth) {
  let listResults = await auth.listUsers(1000);
  const uids = listResults.users.map((user) => user.uid);
  while (listResults.pageToken) {
    listResults = await auth.listUsers(1000, listResults.pageToken);
    listResults.users.forEach((user) => uids.push(user.uid));
  }
  return uids;
}

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
      console.info("Deleting users and teachers...");
      const uids = await getAllUsers(auth);
      await auth.deleteUsers(uids);
      await deleteCollection(db, "teachers");
      await deleteCollection(db, "students");
      await deleteCollection(db, "studentMappingUid");
      await deleteCollection(db, "studentMappingHash");
      await deleteCollection(db, "studentRestore");
      console.info("Deleted users and teachers!");
    }
    console.info("Importing users...");
    const teachers = JSON.parse(await readFile("data/users.json", "utf-8"));

    const res = await Promise.all(
      Object.entries(teachers).map(async ([email, record]) => {
        const user = validateOrExit(userSchema, record, { email });

        const prevUser = await auth.getUserByEmail(user.email).catch(() => undefined);
        if (!prevUser) {
          const newUser = await auth.createUser({
            email: user.email,
            emailVerified: true,
            password: user.password,
            displayName: user.name,
            disabled: false,
          });
          await db
            .doc(`teachers/${newUser.uid}`)
            .withConverter(teacherConverter)
            .set({ id: newUser.uid });
        } else {
          await db
            .doc(`teachers/${prevUser.uid}`)
            .withConverter(teacherConverter)
            .set({ id: prevUser.uid });
        }
      }),
    );

    console.info(`${res.length} users imported!`);
  }

  if (options.all || options.pdfs) {
    if (options.delete) {
      console.info("Deleting pdfs...");
      await deleteCollection(db, "pdfs");
      console.info("Deleted pdfs!");
    }
    console.info("Importing pdfs...");
    for (const contest of Object.values(config)) {
      const variantIds = contest.pdfVariantIds;
      const res = await Promise.all(
        variantIds.map(async (variantId) => {
          const path = join("pdf/final", `${variantId}.pdf`);
          const pdfFile = readFileSync(path);
          await db.doc(`pdfs/${variantId}`).withConverter(pdfConverter).set({
            id: variantId,
            statement: pdfFile,
          });
        }),
      );
      console.info(`${res.length} pdfs imported!`);
    }
  }

  if (options.all || options.schools) {
    if (options.delete) {
      console.info("Deleting schools...");
      await deleteCollection(db, "schools");
      await deleteCollection(db, "schoolMapping");
      console.info("Deleted schools!");
    }
    console.info("Importing schools...");
    const schools = JSON.parse(await readFile("data/schools.json", "utf-8"));

    const res = await Promise.all(
      schools.map(async (record: any) => {
        const contestId = record.contestId;
        const allVariantIds = config[contestId].pdfVariantIds.slice();
        const seed = `#schools#${config[contestId].secret}#${record.schoolId}#${record.contestId}#`;
        const rng = new Rng(seed);
        rng.shuffle(allVariantIds);
        const pdfCount = config[contestId].pdfPerSchool;
        record.pdfVariants = allVariantIds.slice(0, pdfCount);
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

  if (options.all || options.variants || options.solutions) {
    if (options.delete) {
      if (options.all || options.variants) {
        console.info("Deleting variants...");
        await deleteCollection(db, "variants");
        await deleteCollection(db, "variantMapping");
        console.info("Deleted variants!");
      }
      if (options.all || options.solutions) {
        console.info("Deleting solutions...");
        await deleteCollection(db, "solutions");
        console.info("Deleted solutions!");
      }
    }
    for (const contest of Object.values(config)) {
      const { solutions, variants } = await exportVariants(cwd(), contest);

      if (options.all || options.variants) {
        console.info("Importing variants...");

        const res = await Promise.all(
          Object.entries(variants).map(async ([id, variant]) => {
            await db.doc(`variants/${id}`).withConverter(variantConverter).set(variant);
          }),
        );
        console.info(`${res.length} variants imported!`);

        const variantIds = contest.variantIds.filter((x) => !contest.pdfVariantIds.includes(x));
        console.info("Importing variant mappings...");
        const prefix = contest.id;
        const rng = new Rng(`#variantMappings#${contest.secret}#`);
        const res2 = await Promise.all(
          range(4096).map(async (i) => {
            const suffix = Buffer.from([i / 256, i % 256])
              .toString("hex")
              .slice(1)
              .toUpperCase();
            const id = `${prefix}-${suffix}`;
            await db
              .doc(`variantMapping/${id}`)
              .withConverter(variantMappingConverter)
              .set({
                id,
                variant: variantIds[rng.randInt(0, contest.variantIds.length - 1)],
              });
          }),
        );
        console.info(`${res2.length} variant mappings imported!`);
      }

      if (options.all || options.solutions) {
        console.info("Importing solutions...");
        const res = await Promise.all(
          Object.entries(solutions).map(async ([id, solution]) => {
            await db.doc(`solutions/${id}`).withConverter(solutionConverter).set(solution);
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
