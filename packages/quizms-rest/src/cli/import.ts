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
import ky, { HTTPError, type KyInstance } from "ky";
import { keyBy, uniq, xor } from "lodash-es";
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
  teachers?: true;
  venueWindows?: true;
  statements?: true;
  students?: true;
  tokens?: true;
  variants?: true;
};

export default async function importData(options: ImportOptions) {
  if (!existsSync("data")) {
    fatal("Cannot find data directory. Make sure you're inside a QuizMS project.");
  }
  const api = ky.create({
    prefixUrl: options.apiUrl,
    hooks: {
      beforeRequest: [
        (request) => {
          request.headers.set("Cookie", `admin_token=${options.adminToken}`);
        },
      ],
    },
  });

  if (options.contests) {
    await importContests(api, options);
  }
  if (options.venues || options.teachers || options.venueWindows) {
    await importVenues(api, options);
  }
  if (options.students || options.tokens) {
    await importStudents(api, options);
  }
  if (options.variants) {
    await importVariants(api, options);
  }
  if (options.statements) {
    await importStatements(api, options);
  }
}

async function importContests(api: KyInstance, options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  await adminImport(
    api,
    "contests",
    contests.map((c) => ({
      id: c.id,
      get: `admin/contest/${c.id}/get`,
      cas: `admin/contest/${c.id}/cas`,
      value: c,
    })),
    options,
  );
}

async function importStudents(api: KyInstance, options: ImportOptions) {
  const importStudentSchema = studentSchema
    .omit({
      answers: true,
      participationWindow: true,
      uid: true,
    })
    .extend({
      token: studentSchema.shape.token.unwrap(),
      absent: studentSchema.shape.absent.default(false),
      disabled: studentSchema.shape.disabled.default(false),
      score: studentSchema.shape.score.default(null),
      createdAt: studentSchema.shape.createdAt.default(new Date()),
    })
    .transform((data) => ({ ...data, uid: null }));
  const students = await load("students", importStudentSchema);
  if (options.students) {
    await adminImport(
      api,
      "students",
      students.map((s) => ({
        id: s.id,
        get: `admin/venue/${s.venueId}/student/${s.id}/data/get`,
        cas: `admin/venue/${s.venueId}/student/${s.id}/data/cas`,
        value: s,
      })),
      options,
    );
  }
  if (options.tokens) {
    await adminImport(
      api,
      "tokens",
      students.map((s) => ({
        id: s.id,
        get: `admin/token/${s.token}/get`,
        cas: `admin/token/${s.token}/cas`,
        value: {
          value: s.token,
          venue_id: s.venueId,
          student_id: s.id,
        },
      })),
      options,
    );
  }
}

async function importVenues(api: KyInstance, options: ImportOptions) {
  const importVenueSchema = z.preprocess(
    (data: any) => ({
      ...data,
      participationWindow: data.start && data.end && { start: data.start, end: data.end },
      start: undefined,
      end: undefined,
    }),
    venueSchema
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
      })
      .strip(),
  );
  const schools = await load("venues", importVenueSchema);
  const contests = await loadContests();

  if (options.teachers) {
    const teachers = schools.map((school) => ({
      username: school.id,
      password: school.password,
      venues: contests
        .filter((contest) => picomatch.isMatch(contest.id, school.contestIds))
        .map((contest) => `${school.id}-${contest.id}`),
    }));
    await adminImport(
      api,
      "teacher",
      teachers.map((t) => ({
        id: t.username,
        get: `admin/teacher/${t.username}/get`,
        cas: `admin/teacher/${t.username}/cas`,
        value: t,
      })),
      options,
    );
  }
  if (options.venues || options.venueWindows) {
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
          schoolId: school.id,
          contestId: contest.id,
          name: school.name,
          finalized: false,
          pdfVariants,
          disabled: false,
          participationWindow: school.participationWindow,
        });
      }
    }
    if (options.venues) {
      await adminImport(
        api,
        "venues",
        venues.map((v) => ({
          id: v.id,
          get: `admin/venue/${v.id}/data/get`,
          cas: `admin/venue/${v.id}/data/cas`,
          value: v,
        })),
        options,
      );
    }
    if (options.venueWindows) {
      await adminImport(
        api,
        "venueWindows",
        venues.map((v) => ({
          id: v.id,
          get: `admin/venue/${v.id}/window/get`,
          cas: `admin/venue/${v.id}/window/cas`,
          value: v.participationWindow,
        })),
        options,
      );
    }
  }
}

async function importVariants(api: KyInstance, options: ImportOptions) {
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
  await adminImport(
    api,
    "variants",
    variants.map((v) => ({
      id: v.id,
      get: `admin/variant/${v.id}/get`,
      cas: `admin/variant/${v.id}/cas`,
      value: v,
    })),
    options,
  );
}

async function importStatements(api: KyInstance, options: ImportOptions) {
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

  const { idsToImport } = await checkExisting(
    api,
    "statements",
    statements.map(([_, remote]) => ({
      id: remote,
      get: `/admin/file/get/${remote}`,
    })),
    options,
    true,
  );

  const bar = new SingleBar({
    format: "  {bar} {percentage}% | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
  });
  bar.start(idsToImport.length, 0);

  for (const [local, remote] of statements) {
    if (!idsToImport.includes(remote)) {
      continue;
    }
    try {
      const content = await readFile(local);
      const res = await api.post(`admin/file/set/${remote}`, {
        body: content,
        headers: {
          "content-type": "application/octet-stream",
        },
      });
      if (!res.ok) {
        fatal(`Got error code while uploading statements: ${res.statusText}`);
      }
    } catch (err) {
      fatal(`Got error while uploading statements: ${err}`);
    }
    bar.increment(1);
  }
  bar.update(idsToImport.length);
  bar.stop();
  success(`${idsToImport.length} statements imported!`);
}

type importable<T> = {
  id: string;
  get: string;
  cas: string;
  value: T;
};

async function checkExisting<T>(
  api: KyInstance,
  name: string,
  dataList: Omit<importable<T>, "cas" | "value">[],
  options: ImportOptions,
  raw?: boolean,
) {
  const data = keyBy(dataList, (d) => d.id);
  const existing: Record<string, T> = {};
  for (const id in data) {
    try {
      const getUrl = new URL(data[id].get, options.apiUrl);
      const res = await api.get<T>(getUrl);
      if (raw) existing[id] = res.body! as any;
      else {
        const j = await res.json();
        if (j !== null) {
          existing[id] = j;
        }
      }
    } catch (err) {
      if (raw && err instanceof HTTPError && err.response.status === 404) continue;
      fatal(`Cannot import ${name}, error while fetching existing data: ${err}`);
    }
  }

  const existingIds = Object.keys(existing);

  if (existingIds.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `${existingIds.length} \`${name}\` already exist. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const nonExistingIds = xor(Object.keys(data), existingIds);

  const idsToImport = options.skipExisting ? nonExistingIds : Object.keys(data);

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
  return { existing, idsToImport };
}

async function adminImport<T>(
  api: KyInstance,
  name: string,
  dataList: importable<T>[],
  options: ImportOptions,
) {
  const data = keyBy(dataList, (d) => d.id);
  const { existing, idsToImport } = await checkExisting(api, name, dataList, options);
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
  });
  bar.start(idsToImport.length, 0);

  for (const id of idsToImport) {
    const casUrl = new URL(data[id].cas, options.apiUrl);
    try {
      const res = await api.post(casUrl, {
        method: "post",
        json: {
          old: existing[id] ?? null,
          new: data[id].value,
        },
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
