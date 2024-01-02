import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Firestore, FirestoreDataConverter, GrpcStatus } from "firebase-admin/firestore";
import { capitalize, lowerCase, map, pick, range, uniq } from "lodash-es";
import pc from "picocolors";
import { isMatch } from "picomatch";
import z from "zod";

import {
  contestConverter,
  participationConverter,
  pdfConverter,
  solutionConverter,
  statementConverter,
  variantConverter,
  variantMappingConverter,
} from "~/firebase/convertersAdmin";
import { Participation, contestSchema, participationSchema } from "~/models";
import { generationConfigSchema } from "~/models/generation-config";
import { Rng } from "~/utils/random";

import { confirm, fatal, info, success, warning } from "../utils/logs";
import { readCollection } from "../utils/parser";
import { buildVariants } from "../variants";
import { initializeDb } from "./common";

type ImportOptions = {
  dir: string;
  config: string;
  delete?: true;
  force?: true;

  contests?: true;
  pdfs?: true;
  schools?: true;
  solutions?: true;
  statements?: true;
  teachers?: true;
  variantMappings?: true;
  variants?: true;
};

export default async function importData(options: ImportOptions) {
  process.env.QUIZMS_MODE = "contest";

  if (!existsSync(join(options.dir, "data"))) {
    fatal(
      `Cannot find data directory at ${options.dir}. Make sure you're in the root of a QuizMS project or specify a different directory, use \`--help\` for usage.`,
    );
  }

  const collections: (keyof ImportOptions)[] = [
    "contests",
    "pdfs",
    "schools",
    "solutions",
    "statements",
    "teachers",
    "variantMappings",
    "variants",
  ];
  if (collections.every((key) => !options[key])) {
    warning(`Nothing to import. Use \`--help\` for usage.`);
    return;
  }

  const [app, db] = await initializeDb(options.dir);

  if (options.contests) {
    await importContests(db, options);
  }
  if (options.schools || options.teachers) {
    await importParticipations(db, options);
  }
  if (options.pdfs) {
    await importPdf(db, options);
  }
  if (options.variants || options.statements || options.solutions || options.variantMappings) {
    await importVariants(db, options);
  }

  success("All done!");
  await deleteApp(app);
}

async function importContests(db: Firestore, options: ImportOptions) {
  const contests = await readCollection(options.dir, "contests", contestSchema);
  await importCollection(db, "contests", contests, contestConverter, options);
}

async function importParticipations(db: Firestore, options: ImportOptions) {
  const schoolSchema = participationSchema
    .omit({
      schoolId: true,
      teacher: true,
      contestId: true,
    })
    .extend({
      contestIds: z.union([z.string(), z.array(z.string())]),
      email: z.string().email(),
      password: z.string(),
    });
  const schools = await readCollection(options.dir, "schools", schoolSchema);
  const configs = await readCollection(options.dir, "contests", generationConfigSchema);

  if (options.teachers) {
    const teachers = schools.map((school) => pick(school, ["name", "email", "password"]));
    await importTeachers(db, teachers, options);
  }

  if (options.schools) {
    const auth = getAuth();
    const participations: Participation[] = [];

    for (const config of configs) {
      const rng = new Rng(`${config.secret}-${config.id}-participations`);

      for (const school of schools) {
        if (!isMatch(config.id, school.contestIds)) continue;

        const pdfVariants = rng.sample(config.pdfVariantIds, config.pdfPerSchool);

        const participation: Participation = {
          id: `${school.id}-${config.id}`,
          schoolId: school.id,
          contestId: config.id,
          name: school.name,
          teacher: "",
          finalized: false,
          pdfVariants,
        };
        try {
          const user = await auth.getUserByEmail(school.email);
          participation.teacher = user.uid;
        } catch (e) {
          fatal(
            `Teacher ${participation.teacher} does not exist. Make sure to import teachers first.`,
          );
        }
        participations.push(participation);
      }
    }

    await importCollection(db, "participations", participations, participationConverter, options);
  }
}

type Teacher = {
  name: string;
  email: string;
  password: string;
};

async function importTeachers(db: Firestore, teachers: Teacher[], options: ImportOptions) {
  const auth = getAuth();
  const ids = await Promise.all(
    teachers.map(async (teacher) => {
      let user = await auth.getUserByEmail(teacher.email).catch(() => undefined);
      if (!user) {
        user = await auth.createUser({
          email: teacher.email,
          emailVerified: true,
          password: teacher.password,
          displayName: teacher.name,
          disabled: false,
        });
      } else if (options.force) {
        await auth.updateUser(user.uid, {
          email: teacher.email,
          emailVerified: true,
          password: teacher.password,
          displayName: teacher.name,
          disabled: false,
        });
      } else {
        fatal(`Teacher ${teacher.email} already exists. Use \`--force\` to overwrite.`);
      }
      await auth.setCustomUserClaims(user.uid, { isTeacher: true });
      return { id: user.uid };
    }),
  );

  const converter: FirestoreDataConverter<{ id: string }> = {
    toFirestore: () => ({}),
    fromFirestore: (snap) => ({ id: snap.id }),
  };
  await importCollection(db, "teachers", ids, converter, options);
}

async function importPdf(db: Firestore, options: ImportOptions) {
  const generationConfigs = await readCollection(options.dir, "contests", generationConfigSchema);
  const pdfs = await Promise.all(
    generationConfigs
      .flatMap((c) => uniq([...c.variantIds, ...c.pdfVariantIds]))
      .map(async (id) => {
        try {
          const statement = await readFile(join("variants", id, "statement.pdf"));
          return { id, statement };
        } catch (e) {
          fatal(`Cannot find pdf of variant ${id}. Use \`quizms pdf\` to generate it first.`);
        }
      }),
  );

  await importCollection(db, "pdfs", pdfs, pdfConverter, options);
}

async function importVariants(db: Firestore, options: ImportOptions) {
  const generationConfigs = await readCollection(options.dir, "contests", generationConfigSchema);

  const variants = await buildVariants(join(options.dir, "src"), generationConfigs);
  if (options.variants) {
    await importCollection(db, "variants", map(variants, 0), variantConverter, options);
  }
  if (options.statements) {
    await importCollection(db, "statements", map(variants, 1), statementConverter, options);
  }
  if (options.solutions) {
    await importCollection(db, "solutions", map(variants, 2), solutionConverter, options);
  }
  if (options.variantMappings) {
    const mappings = await Promise.all(
      generationConfigs.flatMap((config) => {
        const rng = new Rng(`${config.secret}-${config.id}-variantMappings`);
        return range(4096).map(async (i) => {
          const suffix = i.toString(16).padStart(3, "0").toUpperCase();
          return {
            id: `${config.id}-${suffix}`,
            variant: rng.choice(config.variantIds),
          };
        });
      }),
    );
    await importCollection(db, "variantMappings", mappings, variantMappingConverter, options);
  }
}

async function importCollection<T extends { id: string }>(
  db: Firestore,
  collection: string,
  data: T[],
  converter: FirestoreDataConverter<T>,
  options: ImportOptions,
) {
  if (options.delete) {
    await deleteCollection(db, collection);
  }

  await confirm(
    `You are about to import the ${pc.bold(lowerCase(collection))}. ${
      options.force ? "This will overwrite any existing data. " : ""
    }Are you sure?`,
  );

  for (let i = 0; i < data.length; i += 400) {
    const batch = db.batch();
    for (const record of data.slice(i, i + 400)) {
      const ref = db.doc(`${collection}/${record.id}`).withConverter(converter);
      if (options?.force) {
        batch.set(ref, record);
      } else {
        batch.create(ref, record);
      }
    }
    try {
      await batch.commit();
    } catch (e: any) {
      if (e.code === GrpcStatus.ALREADY_EXISTS) {
        fatal(
          `Document already exists in \`${collection}\`. Use \`--force\` to overwrite existing documents.`,
        );
      } else {
        fatal(`Cannot import ${lowerCase(collection)}: ${e}`);
      }
    }
  }

  success(`${capitalize(lowerCase(collection))} imported!`);
}

async function deleteCollection(db: Firestore, collection: string) {
  await confirm(`You are about to delete all ${pc.bold(lowerCase(collection))}. Are you sure?`);

  const collectionRef = db.collection(collection);
  const query = collectionRef.limit(400);

  for (;;) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  info(`${capitalize(collection)} deleted!`);
}
