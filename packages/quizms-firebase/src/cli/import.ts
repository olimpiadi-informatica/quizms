import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Bucket } from "@google-cloud/storage";
import {
  contestSchema,
  type Participation,
  participationSchema,
  studentSchema,
  variantSchema,
  variantsConfigSchema,
} from "@olinfo/quizms/models";
import { Rng, validate } from "@olinfo/quizms/utils";
import { fatal, load, loadContests, success, warning } from "@olinfo/quizms/utils-node";
import { deleteApp } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { groupBy, uniq } from "lodash-es";
import picomatch from "picomatch";
import { glob } from "tinyglobby";
import z from "zod";

import { userSchema } from "~/models/user";
import { websiteSchema } from "~/models/website";

import { importCollection } from "./utils/collection";
import {
  contestConverter,
  participationConverter,
  studentConverter,
  variantConverter,
  websiteConverter,
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
  websites?: true;
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
    "websites",
  ];
  if (collections.every((key) => !options[key])) {
    warning("`Nothing to import. Use `--help` for usage.`");
    return;
  }

  const { app, bucket, db } = await initializeFirebase();

  if (options.admins) {
    await importAdmins(db, options);
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
  if (options.websites) {
    await importWebsites(db, options);
  }
  if (options.statements) {
    await importStatements(bucket, options);
  }

  success("All done!");
  await deleteApp(app);
}

async function importAdmins(db: Firestore, options: ImportOptions) {
  const users = await load("admins", userSchema.omit({ role: true }));
  await importUsers(db, "admin", users, options);
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
  const contests = await loadContests();

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
            const rng = new Rng(`${contest.secret}-${contest.id}-${school.id}-participation`);
            pdfVariants = rng.sample(contest.pdfVariantIds, contest.pdfPerSchool);
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
        const fileName = path.join("variants", config.id, id, "answers.json");
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

async function importWebsites(db: Firestore, options: ImportOptions) {
  const websites = await load("websites", websiteSchema);
  await importCollection(db, "websites", websites, websiteConverter, options);
}

async function importStatements(bucket: Bucket, options: ImportOptions) {
  const contests = await loadContests();

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const statements = contests.map(async (config) => {
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
