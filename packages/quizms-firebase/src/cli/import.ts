import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Bucket } from "@google-cloud/storage";
import {
  contestSchema,
  studentSchema,
  type Venue,
  variantSchema,
  variantsConfigSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import { contestStatementFile, Rng, validate } from "@olinfo/quizms/utils";
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
  studentConverter,
  variantConverter,
  venueConverter,
  websiteConverter,
} from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";
import { importStorage } from "./utils/storage";
import { importUsers } from "./utils/users";

type ImportOptions = {
  config: string;
  filterContest?: string;
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

  if (options.filterContest) {
    const contests = await load("contests", contestSchema);
    if (!contests.some((contest) => contest.id === options.filterContest)) {
      fatal(`Cannot find contest with id \`${options.filterContest}\`.`);
    }
  }

  const { app, bucket, db } = await initializeFirebase();

  if (options.admins) {
    await importAdmins(db, options);
  }
  if (options.contests) {
    await importContests(db, options);
  }
  if (options.schools || options.teachers) {
    await importVenues(db, options);
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
  let contests = await load("contests", contestSchema);
  if (options.filterContest) {
    contests = contests.filter((contest) => contest.id === options.filterContest);
  }
  await importCollection(db, "contests", contests, contestConverter, {
    ...options,
    deleteIds:
      options.delete && options.filterContest ? contests.map((contest) => contest.id) : undefined,
  });
}

async function importVenues(db: Firestore, options: ImportOptions) {
  const schoolSchema = venueSchema
    .omit({
      schoolId: true,
      contestId: true,
    })
    .extend({
      contestIds: z.union([z.string(), z.array(z.string())]).default("*"),
      password: z.string(),
    });
  const schools = await load("schools", schoolSchema);
  let contests = await loadContests();
  if (options.filterContest) {
    contests = contests.filter((contest) => contest.id === options.filterContest);
  }

  const matchingSchools = options.filterContest
    ? schools.filter((school) => picomatch.isMatch(options.filterContest!, school.contestIds))
    : schools;

  if (options.teachers) {
    const teachers = matchingSchools.map((school) => ({
      name: school.name,
      username: school.id,
      password: school.password,
    }));
    await importUsers(db, "teacher", teachers, {
      ...options,
      deleteIds: options.delete ? matchingSchools.map((school) => school.id) : undefined,
    });
  }

  if (options.schools) {
    const venues: Venue[] = [];

    for (const contest of contests) {
      for (const school of matchingSchools) {
        if (!picomatch.isMatch(contest.id, school.contestIds)) continue;

        let pdfVariants: string[] = [];
        if (contest.hasVariants) {
          if (school.pdfVariants.length > 0) {
            pdfVariants = school.pdfVariants.map((id) => `${contest.id}-${id}`);
          } else {
            const rng = new Rng(`${contest.secret}-${contest.id}-${school.id}-venue`);
            pdfVariants = rng.sample(contest.pdfVariantIds, contest.pdfPerSchool);
          }
        }

        venues.push({
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

    await importCollection(db, "venues", venues, venueConverter, {
      ...options,
      deleteIds:
        options.delete && options.filterContest ? venues.map((venue) => venue.id) : undefined,
    });
  }
}

async function importStudents(db: Firestore, options: ImportOptions) {
  let students = await load("students", studentSchema);
  if (options.filterContest) {
    students = students.filter((student) => student.contestId === options.filterContest);
  }
  const venues = groupBy(students, "venueId");
  await Promise.all(
    Object.entries(venues).map(([venueId, students]) =>
      importCollection(db, `venues/${venueId}/students`, students, studentConverter, {
        ...options,
        deleteIds:
          options.delete && options.filterContest
            ? students.map((student) => student.id)
            : undefined,
      }),
    ),
  );
}

async function importVariants(db: Firestore, options: ImportOptions) {
  let variantsConfig = await load("variants", variantsConfigSchema);
  if (options.filterContest) {
    variantsConfig = variantsConfig.filter((config) => config.id === options.filterContest);
  }
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
  await importCollection(db, "variants", variants, variantConverter, {
    ...options,
    deleteIds:
      options.delete && options.filterContest ? variants.map((variant) => variant.id) : undefined,
  });
}

/**
 * Checks that every language of each contest has its statements, so that the language selector
 * never points to a missing file. `quizms variants --languages` can build only some languages.
 */
async function checkStatementLanguages(contests: Awaited<ReturnType<typeof loadContests>>) {
  const missing: string[] = [];
  for (const config of contests) {
    const multilingual = config.languages.length > 1;
    for (const id of uniq([...config.variantIds, ...config.pdfVariantIds])) {
      const localDir = path.join("variants", config.id, id);
      const files = new Set(await glob("statement*.{txt,pdf}", { cwd: localDir }));
      // PDFs are optional (`quizms print` may not have been run), but must be complete.
      const hasPdf = [...files].some((file) => file.endsWith(".pdf"));
      for (const language of config.languages) {
        const required = [contestStatementFile(config.languages, language)];
        if (hasPdf) required.push(multilingual ? `statement.${language}.pdf` : "statement.pdf");
        for (const file of required) {
          if (!files.has(file)) missing.push(path.join(localDir, file));
        }
      }
    }
  }
  if (missing.length > 0) {
    fatal(
      `Missing statements for some contest languages, run \`quizms variants\` (and \`quizms print\`) for all languages first:\n${missing.map((f) => `  - ${f}`).join("\n")}`,
    );
  }
}

async function importWebsites(db: Firestore, options: ImportOptions) {
  const websites = await load("websites", websiteSchema);
  await importCollection(db, "websites", websites, websiteConverter, options);
}

async function importStatements(bucket: Bucket, options: ImportOptions) {
  let contests = await loadContests();
  if (options.filterContest) {
    contests = contests.filter((contest) => contest.id === options.filterContest);
  }
  await checkStatementLanguages(contests);

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const statements = contests.map(async (config) => {
    const files = uniq([...config.variantIds, ...config.pdfVariantIds]).map(
      async (id): Promise<[string, string][]> => {
        const localDir = path.join("variants", config.id, id);
        const remoteDir = path.join("statements", config.id, id);
        const files = await glob("*.{pdf,css,txt,mjs}", { cwd: localDir });

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
