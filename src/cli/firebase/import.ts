import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Bucket } from "@google-cloud/storage";
import { deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Firestore, FirestoreDataConverter } from "firebase-admin/firestore";
import { pick, range, uniq } from "lodash-es";
import { isMatch } from "picomatch";
import z from "zod";

import { Participation, contestSchema, participationSchema, variantSchema } from "~/models";
import { generationConfigSchema } from "~/models/generation-config";
import load from "~/models/load";
import { fatal, success, warning } from "~/utils/logs";
import { Rng } from "~/utils/random";
import validate from "~/utils/validate";

import { importCollection } from "./utils/collection";
import {
  contestConverter,
  participationConverter,
  variantConverter,
  variantMappingConverter,
} from "./utils/convertersAdmin";
import { initializeFirebase } from "./utils/initialize";
import { importStorage } from "./utils/storage";

type ImportOptions = {
  dir: string;
  config: string;
  delete?: true;
  force?: true;

  contests?: true;
  pdfs?: true;
  schools?: true;
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
    "statements",
    "teachers",
    "variantMappings",
    "variants",
  ];
  if (collections.every((key) => !options[key])) {
    warning(`Nothing to import. Use \`--help\` for usage.`);
    return;
  }

  const { app, bucket, db } = await initializeFirebase(options.dir);

  if (options.contests) {
    await importContests(db, options);
  }
  if (options.schools || options.teachers) {
    await importParticipations(db, options);
  }
  if (options.pdfs) {
    await importPdf(bucket, options);
  }
  if (options.variants) {
    await importVariants(db, options);
  }
  if (options.statements) {
    await importStatements(bucket, options);
  }
  if (options.variantMappings) {
    await importVariantMappings(db, options);
  }

  success("All done!");
  await deleteApp(app);
}

async function importContests(db: Firestore, options: ImportOptions) {
  const contests = await load(options.dir, "contests", contestSchema);
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
  const schools = await load(options.dir, "schools", schoolSchema);
  const configs = await load(options.dir, "contests", generationConfigSchema);

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

async function importPdf(bucket: Bucket, options: ImportOptions) {
  const generationConfigs = await load(options.dir, "contests", generationConfigSchema);
  const pdfs = generationConfigs.flatMap((c) =>
    uniq([...c.variantIds, ...c.pdfVariantIds]).map((id): [string, string] => [
      join(options.dir, "variants", id, "statement.pdf"),
      join("statements", id, `statement-${c.statementVersion}.pdf`),
    ]),
  );

  await importStorage(bucket, "PDFs", pdfs, options);
}

async function importVariants(db: Firestore, options: ImportOptions) {
  const generationConfigs = await load(options.dir, "contests", generationConfigSchema);
  const variants = await Promise.all(
    generationConfigs
      .flatMap((c) => uniq([...c.variantIds, ...c.pdfVariantIds]))
      .map(async (id) => {
        const path = join(options.dir, "variants", id, "schema.json");
        let schema: string;
        try {
          schema = await readFile(path, "utf-8");
        } catch (e) {
          fatal(`Cannot find schema for variant ${id}. Use \`quizms variants\` to generate it.`);
        }
        try {
          return validate(variantSchema, JSON.parse(schema));
        } catch (e) {
          fatal(`Invalid schema for variant ${id}: ${e}`);
        }
      }),
  );
  await importCollection(db, "variants", variants, variantConverter, options);
}

async function importStatements(bucket: Bucket, options: ImportOptions) {
  const generationConfigs = await load(options.dir, "contests", generationConfigSchema);

  const statements = generationConfigs.flatMap((c) =>
    uniq([...c.variantIds, ...c.pdfVariantIds]).map((id): [string, string] => [
      join(options.dir, "variants", id, "statement.js"),
      join("statements", id, `statement-${c.statementVersion}.js`),
    ]),
  );
  await importStorage(bucket, "statements", statements, options);
}

async function importVariantMappings(db: Firestore, options: ImportOptions) {
  const generationConfigs = await load(options.dir, "contests", generationConfigSchema);
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
