import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Bucket } from "@google-cloud/storage";
import { deleteApp } from "firebase-admin/app";
import { type EmailIdentifier, getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { chunk, groupBy, pick, range, uniq } from "lodash-es";

import { contestSchema, schoolSchema, studentSchema, variantSchema } from "~/models";
import load from "~/models/load";
import { variantsConfigSchema } from "~/models/variants-config";
import { fatal, success, warning } from "~/utils/logs";
import { Rng } from "~/utils/random";
import validate from "~/utils/validate";

import { getParticipations } from "~/models/utils";
import { importCollection } from "./utils/collection";
import {
  contestConverter,
  participationConverter,
  studentConverter,
  variantConverter,
  variantMappingConverter,
} from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";
import { importStorage } from "./utils/storage";
import { importUsers, userSchema } from "./utils/users";

type ImportOptions = {
  config: string;
  skipExisting?: true;
  delete?: true;
  force?: true;

  admins?: true;
  contests?: true;
  pdfs?: true;
  schools?: true;
  statements?: true;
  students?: true;
  teachers?: true;
  variantMappings?: true;
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
    "pdfs",
    "schools",
    "statements",
    "students",
    "teachers",
    "variantMappings",
    "variants",
  ];
  if (collections.every((key) => !options[key])) {
    warning("`Nothing to import. Use `--help` for usage.`");
    return;
  }

  const { app, bucket, db } = await initializeFirebase();

  if (options.admins) {
    await importAdmins(options);
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

async function importAdmins(options: ImportOptions) {
  const admins = await load("admins", userSchema);
  await importUsers(admins, { isAdmin: true }, options);
  success("Admin users imported!");
}

async function importContests(db: Firestore, options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  await importCollection(db, "contests", contests, contestConverter, options);
}

async function importParticipations(db: Firestore, options: ImportOptions) {
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);

  if (options.teachers) {
    const teachers = schools.map((school) => pick(school, ["name", "email", "password"]));
    await importUsers(teachers, { isTeacher: true }, options);
  }

  if (options.schools) {
    const auth = getAuth();

    const emails = schools.map((school) => ({ email: school.email }));
    const usersIds: Record<string, string> = {};
    for (const emailChunk of chunk(emails, 100)) {
      const users = await auth.getUsers(emailChunk);
      if (users.notFound.length > 0) {
        const id = (users.notFound[0] as EmailIdentifier).email.replace("@teacher.edu", "");
        fatal(`Teacher ${id} does not exist. Make sure to import teachers first.`);
      }
      for (const user of users.users) {
        usersIds[user.email as string] = user.uid;
      }
    }

    const participations = await getParticipations(contests, schools, usersIds);

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

async function importPdf(bucket: Bucket, options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  const variantsConfig = await load("variants", variantsConfigSchema);

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const pdfs = contests.flatMap((contest) => {
    const config = variantsConfig.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }

    return uniq([...config.variantIds, ...config.pdfVariantIds]).flatMap(
      (id): [string, string][] => {
        return [
          [
            path.join("variants", config.id, id, "statement.pdf"),
            path.join("statements", config.id, id, `statement-${timestamp}.pdf`),
          ],
          [
            path.join("variants", config.id, id, "statement.pdf"),
            path.join("statements", config.id, id, "statement.pdf"),
          ],
        ];
      },
    );
  });

  await importStorage(bucket, "PDFs", pdfs, options);
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

  const statementVersion = await readFile(path.join("variants", "version.txt"), "utf8");

  const statements = contests.flatMap((contest) => {
    const config = variantsConfig.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }

    return uniq([...config.variantIds, ...config.pdfVariantIds]).map((id): [string, string] => [
      path.join("variants", config.id, `${id}.txt`),
      path.join("statements", config.id, id, `statement-${statementVersion}.txt`),
    ]);
  });
  await importStorage(bucket, "statements", statements, options);
}

async function importVariantMappings(db: Firestore, options: ImportOptions) {
  const variantsConfig = await load("variants", variantsConfigSchema);
  const mappings = variantsConfig.flatMap((config) => {
    const rng = new Rng(`${config.secret}-${config.id}-variantMappings`);
    return range(4096).map((i) => {
      const suffix = i.toString(16).padStart(3, "0").toUpperCase();
      return {
        id: `${config.id}-${suffix}`,
        variant: rng.choice(config.variantIds),
      };
    });
  });
  await importCollection(db, "variantMappings", mappings, variantMappingConverter, options);
}
