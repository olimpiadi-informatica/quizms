import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Bucket } from "@google-cloud/storage";
import {
  contestSchema,
  type Participation,
  participationSchema,
  studentSchema,
  type VariantsConfig,
  variantSchema,
  variantsConfigSchema,
} from "@olinfo/quizms/models";
import { Rng, validate } from "@olinfo/quizms/utils";
import { fatal, load, success, warning } from "@olinfo/quizms/utils-node";
import { deleteApp } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { groupBy, uniq } from "lodash-es";
import picomatch from "picomatch";
import { glob } from "tinyglobby";
import z from "zod";

import { importCollection } from "./utils/collection";
import {
  contestConverter,
  participationConverter,
  studentConverter,
  variantConverter,
} from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";
import { importStorage } from "./utils/storage";
import { importUsers } from "./utils/users";

type ImportOptions = {
  config: string;
  skipExisting?: true;
  delete?: true;
  force?: true;

  admins?: true;
  contests?: true;
  schools?: true;
  statements?: true;
  students?: true;
  teachers?: true;
  variants?: true;
};

export default async function importData(options: ImportOptions) {
  process.env.QUIZMS_MODE = "contest";

  if (!existsSync("data")) {
    fatal("Cannot find data directory. Make sure you're inside a QuizMS project.");
  }

  const collections: (keyof ImportOptions)[] = [
    "admins",
    "contests",
    "schools",
    "statements",
    "students",
    "teachers",
    "variants",
  ];
  if (collections.every((key) => !options[key])) {
    warning("`Nothing to import. Use `--help` for usage.`");
    return;
  }

  const { app, bucket, db } = await initializeFirebase();

  if (options.admins) {
    // await importAdmins(db, options);
  }
  if (options.contests) {
    await importContests(db, options);
  }
  if (options.schools || options.teachers) {
    await importParticipations(db, options);
  }
  if (options.students) {
    await importStudents(db, options);
  }
  if (options.variants) {
    await importVariants(db, options);
  }
  if (options.statements) {
    await importStatements(bucket, options);
  }

  success("All done!");
  await deleteApp(app);
}

async function importContests(db: Firestore, options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  await importCollection(db, "contests", contests, contestConverter, options);
}

async function importParticipations(db: Firestore, options: ImportOptions) {
  const schoolSchema = participationSchema
    .omit({
      schoolId: true,
      contestId: true,
    })
    .extend({
      contestIds: z.union([z.string(), z.array(z.string())]).default("*"),
      password: z.string(),
    });
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);
  let configs: VariantsConfig[] | undefined;

  if (options.teachers) {
    const teachers = schools.map((school) => ({
      name: school.name,
      username: school.id,
      password: school.password,
    }));
    await importUsers(db, "teacher", teachers, options);
  }

  if (options.schools) {
    const participations: Participation[] = [];

    for (const contest of contests) {
      for (const school of schools) {
        if (!picomatch.isMatch(contest.id, school.contestIds)) continue;

        let pdfVariants: string[] | undefined;
        if (contest.hasVariants) {
          if (school.pdfVariants) {
            pdfVariants = school.pdfVariants.map((id) => `${contest.id}-${id}`);
          } else {
            if (!configs) {
              configs = await load("variants", variantsConfigSchema);
            }
            const config = configs.find((c) => c.id === contest.id);
            if (!config) {
              fatal(`Missing variants configuration for contest ${contest.id}.`);
            }

            const rng = new Rng(`${config.secret}-${config.id}-${school.id}-participation`);
            pdfVariants = rng.sample(config.pdfVariantIds, config.pdfPerSchool);
          }
        }

        participations.push({
          id: `${school.id}-${contest.id}`,
          schoolId: school.id,
          contestId: contest.id,
          name: school.name,
          finalized: false,
          pdfVariants,
          disabled: false,
        });
      }
    }

    await importCollection(db, "participations", participations, participationConverter, options);
  }
}

async function importStudents(db: Firestore, options: ImportOptions) {
  const students = await load("students", studentSchema);
  const participations = groupBy(students, "participationId");
  await Promise.all(
    Object.entries(participations).map(([participationId, students]) =>
      importCollection(
        db,
        `participations/${participationId}/students`,
        students,
        studentConverter,
        options,
      ),
    ),
  );
}

async function importVariants(db: Firestore, options: ImportOptions) {
  const variantsConfig = await load("variants", variantsConfigSchema);
  const variants = await Promise.all(
    variantsConfig.flatMap((config) => {
      const ids = uniq([...config.variantIds, ...config.pdfVariantIds]);
      return ids.map(async (id) => {
        const fileName = path.join("variants", config.id, `${id}.json`);
        let schema: string;
        try {
          schema = await readFile(fileName, "utf8");
        } catch {
          fatal(`Cannot find schema for variant ${id}. Use \`quizms variants\` to generate it.`);
        }
        try {
          return validate(variantSchema, JSON.parse(schema));
        } catch (err) {
          fatal(`Invalid schema for variant ${id}: ${err}`);
        }
      });
    }),
  );
  await importCollection(db, "variants", variants, variantConverter, options);
}

async function importStatements(bucket: Bucket, options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  const variantsConfig = await load("variants", variantsConfigSchema);

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const statements = contests.map(async (contest) => {
    const config = variantsConfig.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }

    const files = uniq([...config.variantIds, ...config.pdfVariantIds]).map(
      async (id): Promise<[string, string][]> => {
        const localDir = path.join("variants", config.id, id);
        const remoteDir = path.join("statements", config.id, id);
        const files = await glob("*", { cwd: localDir });

        return files.flatMap((file) => {
          const ext = path.extname(file);
          return [
            [
              path.join(localDir, file),
              path.join(remoteDir, `${path.basename(file, ext)}-${timestamp}${ext}`),
            ],
            [path.join(localDir, file), path.join(remoteDir, file)],
          ];
        });
      },
    );
    return (await Promise.all(files)).flat();
  });
  await importStorage(bucket, "statements", (await Promise.all(statements)).flat(), options);
}
