import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";

import { confirm } from "@inquirer/prompts";
import {
  contestSchema,
  studentSchema,
  type Venue,
  variantSchema,
  variantsConfigSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import { Rng, validate } from "@olinfo/quizms/utils";
import { fatal, load, loadContests, success } from "@olinfo/quizms/utils-node";
import { SingleBar } from "cli-progress";
import { uniq, xor } from "lodash-es";
import picomatch from "picomatch";
import { glob } from "tinyglobby";
import z from "zod";

type ImportOptions = {
  skipExisting?: true;
  delete?: true;
  force?: true;
  apiUrl: string;
  adminToken: string;

  contests?: true;
  venues?: true;
  statements?: true;
  students?: true;
  variants?: true;
};

export default async function importData(options: ImportOptions) {
  if (!existsSync("data")) {
    fatal("Cannot find data directory. Make sure you're inside a QuizMS project.");
  }

  if (options.contests) {
    await importContests(options);
  }
  if (options.venues) {
    await importVenues(options);
  }
  if (options.students) {
    await importStudents(options);
  }
  if (options.variants) {
    await importVariants(options);
  }
  if (options.statements) {
    await importStatements(options);
  }
}

async function importContests(options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  await adminImport("contests", urlBuilder("contest"), contests, options);
}

async function importStudents(options: ImportOptions) {
  const importStudentSchema = studentSchema
    .omit({
      answers: true,
      participationWindow: true,
      id: true,
    })
    .extend({
      token: studentSchema.shape.token.unwrap(),
      absent: studentSchema.shape.absent.default(false),
      disabled: studentSchema.shape.disabled.default(false),
      score: studentSchema.shape.score.default(null),
      createdAt: studentSchema.shape.createdAt.default(new Date()),
    })
    .transform((data) => ({ ...data, id: data.token }));
  const students = await load("students", importStudentSchema);
  await adminImport("students", urlBuilder("student_data"), students, options);
}

async function importVenues(options: ImportOptions) {
  const importVenueSchema = venueSchema
    .omit({
      schoolId: true,
      contestId: true,
      token: true,
      pdfVariants: true,
    })
    .extend({
      pdfVariants: venueSchema.shape.pdfVariants.nullable().default(null),
      participationWindow: venueSchema.shape.participationWindow.default(null),
      contestIds: z.union([z.string(), z.array(z.string())]).default("*"),
      password: z.string(),
    });
  const schools = await load("venues", importVenueSchema);
  const contests = await loadContests();

  if (options.venues) {
    const venues: Venue[] = [];

    for (const contest of contests) {
      for (const school of schools) {
        if (!picomatch.isMatch(contest.id, school.contestIds)) continue;

        let pdfVariants: string[] = [];
        if (contest.hasVariants) {
          if (school.pdfVariants) {
            pdfVariants = school.pdfVariants.map((id) => `${contest.id}-${id}`);
          } else {
            const rng = new Rng(`${contest.secret}-${contest.id}-${school.id}-venue`);
            pdfVariants = rng.sample(contest.pdfVariantIds, contest.pdfPerSchool);
          }
        }

        venues.push({
          id: `${school.id}-${contest.id}`,
          token: null,
          participationWindow: school.participationWindow,
          schoolId: school.id,
          contestId: contest.id,
          name: school.name,
          finalized: false,
          pdfVariants,
          disabled: false,
        });
      }
    }
    await adminImport("venues", urlBuilder("venue"), venues, options);
  }
}

async function importVariants(options: ImportOptions) {
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
  await adminImport("variants", urlBuilder("variant"), variants, options);
}

async function importStatements(_options: ImportOptions) {
  const contests = await loadContests();

  const timestamp = new Date().toISOString().replace(/:/g, "-");

  const statements = (
    await Promise.all(
      contests.map(async (config) => {
        const files = uniq([...config.variantIds, ...config.pdfVariantIds]).map(
          async (id): Promise<[string, string][]> => {
            const localDir = path.join("variants", config.id, id);
            const remoteDir = path.join(config.id, id);
            const files = await glob("*.{pdf,mjs,css,txt}", { cwd: localDir });

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
      }),
    )
  ).flat();

  // TODO: check if statements already exist
  for (const [local, remote] of statements) {
    try {
      const content = await readFile(local);
      const setUrl = new URL(`/admin/file/set/${remote}`, _options.apiUrl);
      const res = await fetch(setUrl, {
        method: "post",
        headers: {
          "content-type": "application/octet-stream",
          cookie: `admin_token=${_options.adminToken}`,
        },
        body: content,
      });
      if (!res.ok) {
        fatal(`Got error code while uploading statements: ${res.statusText}`);
      }
    } catch (err) {
      fatal(`Got error while uploading statements: ${err}`);
    }
  }
}

function urlBuilder(prefix: string) {
  return (id: string) => ({
    get: `/admin/${prefix}/get/${id}`,
    cas: `/admin/${prefix}/cas`,
  });
}

async function adminImport<T extends { id: string }>(
  name: string,
  url: (id: string) => { get: string; cas: string },
  data: T[],
  options: ImportOptions,
) {
  const newElems: Record<string, T> = {};
  for (const elem of data) {
    if (newElems[elem.id]) {
      fatal(`Cannot import multiple ${name} with the same id: ${elem.id}`);
    }
    newElems[elem.id] = elem;
  }

  const existing: Record<string, T> = {};
  for (const elem of data) {
    try {
      const res = await fetch(new URL(url(elem.id).get, options.apiUrl), {
        headers: {
          cookie: `admin_token=${options.adminToken}`,
        },
      });
      if (!res.ok) {
        fatal(
          `Cannot import ${name}, received error code while fetching existing data: ${res.statusText}`,
        );
      }
      const j = await res.json();
      if (j !== null) {
        existing[elem.id] = j;
      }
    } catch (err) {
      fatal(`Cannot import ${name}, error while fetching existing data: ${err}`);
    }
  }

  const existingIds = Object.keys(existing);

  if (existingIds.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `${existingIds.length} \`${name}\` already exist. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const nonExistingIds = xor(
    data.map((elem) => elem.id),
    existingIds,
  );

  const idsToImport = options.skipExisting ? nonExistingIds : [...existingIds, ...nonExistingIds];

  if (options.force && existingIds.length > 0) {
    const confirmed = await confirm({
      message: `You are about to import the ${styleText(
        "bold",
        name,
      )}. ${existingIds.length} elements will be overwritten, the previous data will be lost. Are you really sure?`,
      default: false,
    });
    if (!confirmed) {
      fatal("Command aborted.");
    }
  }

  const bar = new SingleBar({
    format: "  {bar} {percentage}% | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
  });
  bar.start(idsToImport.length, 0);

  for (const id of idsToImport) {
    const casUrl = new URL(url(id).cas, options.apiUrl);
    try {
      const res = await fetch(casUrl, {
        method: "post",
        headers: {
          "content-type": "application/json",
          cookie: `admin_token=${options.adminToken}`,
        },
        body: JSON.stringify({
          old: existing[id] ?? null,
          new: newElems[id],
        }),
      });
      if (!res.ok) {
        fatal(`Cannot import ${name}, received while importing: ${res.statusText}`);
      }
    } catch (err) {
      fatal(`Cannot import ${name}, error while importing: ${err}`);
    }
    bar.increment(1);
  }
  bar.update(idsToImport.length);
  bar.stop();
  success(`${idsToImport.length} ${name} imported!`);
}
