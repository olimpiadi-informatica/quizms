import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { uniq } from "lodash-es";
import urlJoin from "url-join";
import { z } from "zod";
import { contestSchema, schoolSchema, studentSchema, variantSchema } from "~/models";
import load from "~/models/load";
import { getParticipations } from "~/models/utils";
import { variantsConfigSchema } from "~/models/variants-config";
import { error, fatal, info, success, warning } from "~/utils/logs";
import validate from "~/utils/validate";
import { userdataToRest } from "~/web/rest/common/converters";
import type { Contest as RestContest } from "~/web/rest/quizms-backend/bindings/Contest";
import type { Problem } from "~/web/rest/quizms-backend/bindings/Problem";
import type { StudentData } from "~/web/rest/quizms-backend/bindings/StudentData";
import type { Variant } from "~/web/rest/quizms-backend/bindings/Variant";
import type { Venue } from "~/web/rest/quizms-backend/bindings/Venue";

type ImportOptions = {
  config: string;
  force: true;
  verbose: true;
  dryRun: true;
  token: string;
  url: string;

  admins: true;
  contests: true;
  pdfs?: true;
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
    "pdfs",
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

  if (options.admins) {
    importAdmins(options);
  }
  if (options.contests) {
    await importContests(options);
  }
  if (options.schools || options.teachers) {
    await importParticipations(options);
  }
  if (options.students) {
    await importStudents(options);
  }
  if (options.pdfs) {
    importPdf(options);
  }
  if (options.variants) {
    await importVariants(options);
  }
  success("All done!");
}

function importAdmins(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importContests(options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  info(`Importing ${contests.length} contests...`);
  const res = await Promise.all(
    contests.map(async (contest) => {
      const restContest: RestContest = {
        ...contest,
        userData: contest.userData.map(userdataToRest),
        onlineSettings: contest.hasOnline
          ? {
              windowRange: {
                start: contest.contestWindowStart.toISOString(),
                end: contest.contestWindowEnd.toISOString(),
              },
              duration: BigInt(contest.duration),
              allowRestarts: contest.allowRestart,
            }
          : null,
        offlineEnabled: contest.hasPdf,
        allowStudentAdd: contest.allowStudentImport,
      };
      return await cas(options, "contest", restContest);
    }),
  );
  const total = res.reduce<number>((acc, val) => acc + val, 0);
  info(`Imported ${total} contests.`);
}

async function importParticipations(options: ImportOptions) {
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);
  const participations = await getParticipations(contests, schools, {}); // TODO: add teacherIds
  info(`Importing ${participations.length} participations...`);
  const res = await Promise.all(
    participations.map(async (participation) => {
      const venue: Venue = {
        token: participation.token || null,
        variantsToPrint: participation.pdfVariants || [],
        window:
          (participation.startingTime &&
            participation.endingTime && {
              start: participation.startingTime?.toISOString(),
              end: participation.endingTime?.toISOString(),
            }) ||
          null,
        ...participation,
      };
      return await cas(options, "venue", venue);
    }),
  );
  const total = res.reduce<number>((acc, val) => acc + val, 0);
  info(`Imported ${total} participations.`);
}

async function importStudents(options: ImportOptions) {
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);
  const participations = await getParticipations(contests, schools, {});
  const students = await load(
    "students",
    studentSchema
      .pick({
        contestId: true,
        token: true,
        variant: true,
        userData: true,
      })
      .extend({
        schoolId: z.string(),
      }),
  );
  info(`Importing ${students.length} students...`);
  const res = await Promise.all(
    students.map(async (student) => {
      const participation = participations.find(
        (p) => p.schoolId === student.schoolId && p.contestId === student.contestId,
      );
      if (!participation) {
        fatal(`Cannot find participation for student ${student.token}`);
      }
      const restStudent: StudentData = {
        id: student.token!,
        token: student.token!,
        contestId: student.contestId!,
        venueId: participation.id,
        variantId: student.variant!,
        absent: false,
        disabled: false,
        data: student.userData
          ? Object.fromEntries(
              Object.entries(student.userData).map(
                ([k, v]: [string, string | number | Date | undefined]) => {
                  if (typeof v === "string") {
                    return [k, { string: v }];
                  }
                  if (typeof v === "number") {
                    return [k, { number: v }];
                  }
                  if (v instanceof Date) {
                    return [k, { date: v.toISOString() }];
                  }
                  return [k, null];
                },
              ),
            )
          : null,
      };
      const added = await cas(options, "student_data", restStudent);
      await casRange(options, student.token!, {
        start: participation.startingTime!.toISOString(),
        end: participation.endingTime!.toISOString(),
      });
      return added;
    }),
  );
  const total = res.reduce<number>((acc, val) => acc + val, 0);
  info(`Imported ${total} students.`);
}

async function casRange(
  options: ImportOptions,
  token: string,
  range: { start: string; end: string },
) {
  if (options.verbose) {
    info(`Updating contest range for ${token}...`);
    console.log(range);
  }
  let res: Response;
  if (options.force) {
    res = await fetch(urlJoin(options.url, `/admin/student_data/set_range/${token}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `admin_token=${options.token}`,
      },
      body: JSON.stringify(range),
    });
  } else {
    res = await fetch(urlJoin(options.url, `/admin/student_data/cas_range/${token}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `admin_token=${options.token}`,
      },
      body: JSON.stringify({ new: range }),
    });
  }
  if (res.status !== 200) {
    error(`Failed to import contest range for ${token}: ${res.statusText}`);
  } else {
    success(`Updated contest range for ${token}.`);
  }
}

function importPdf(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importVariants(options: ImportOptions) {
  const variantsConfig = await load("variants", variantsConfigSchema);
  info(`Importing ${variantsConfig.length} variants...`);
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
  const problems: { [key: string]: Problem } = {};
  const restVariants: Variant[] = [];
  for (const variant of variants) {
    const statement = await readFile(
      path.join("variants", variant.contestId, `${variant.id}.txt`),
      "utf-8",
    );
    const statementVersion = await readFile(path.join("variants", "version.txt"), "utf8");
    const restVariant: Variant = {
      id: variant.id,
      contestId: variant.contestId,
      problems: {},
      pdf: null, // TODO: set correctly
      statement: { [statementVersion]: statement },
      allVersions: { [statementVersion]: 0 },
      currentVersion: statementVersion,
      scoringGroups: {},
    };
    for (const [id, problem] of Object.entries(variant.schema)) {
      const problemId = problem.originalId || id;
      if (problem.type === "points") {
        fatal("Points problems are not supported."); // TODO: fix this
      }
      if (problems[problemId] === undefined) {
        problems[problemId] = {
          id: problemId,
          correctScore: problem.maxPoints,
          emptyScore: 0, // TODO: set correctly
          incorrectScore: 0,
          variants: [],
        };
      }
      const [mainId] = id.split(".");
      if (restVariant.scoringGroups[mainId] === undefined) {
        restVariant.scoringGroups[mainId] = [];
      }
      restVariant.scoringGroups[mainId].push(id);
      restVariant.problems[id] = [problemId, problems[problemId].variants.length];
      problems[problemId].variants.push({
        answerInfo: {
          type: "multiplechoice", // TODO: set correctly
          choices:
            problem.options
              ?.filter(
                (
                  option,
                ): option is {
                  value: string | number;
                  points: number;
                  originalId: string;
                } => option.value !== null,
              )
              .map((option) => ({
                isCorrect: option.points > 0,
                value:
                  typeof option.value === "string"
                    ? {
                        string: option.value,
                      }
                    : { number: option.value },
              })) || [],
        },
      });
    }
    restVariants.push(restVariant);
  }
  {
    info(`Importing ${restVariants.length} variants...`);
    const res = await Promise.all([
      ...restVariants.map(async (variant) => {
        return await cas(options, "variant", variant);
      }),
    ]);
    const total = res.reduce<number>((acc, val) => acc + val, 0);
    info(`Imported ${total} variants.`);
  }
  {
    info(`Importing ${Object.keys(problems).length} problems...`);
    const res = await Promise.all([
      ...Object.values(problems).map(async (problem) => {
        return await cas(options, "problem", problem);
      }),
    ]);
    const total = res.reduce<number>((acc, val) => acc + val, 0);
    info(`Imported ${total} problems.`);
  }
}

async function cas(option: ImportOptions, collection: string, newVal: any) {
  if (option.verbose) {
    info(`Importing ${collection} ${newVal.id}...`);
    console.log(newVal);
  }
  let oldVal: any = undefined;
  const old = await fetch(urlJoin(option.url, `/admin/${collection}/get/${newVal.id}`), {
    method: "GET",
    headers: {
      cookie: `admin_token=${option.token}`,
    },
  });
  try {
    oldVal = await old.json();
  } catch {
    oldVal = null;
  }
  if (old.status !== 404 && oldVal != null) {
    if (option.verbose) {
      warning(`Found ${collection} ${newVal.id},`);
      console.log(oldVal);
    }
    if (!option.force) {
      error(`${collection} ${newVal.id} already exists. Use --force to overwrite.`);
      return 0;
    }
  }
  const body = { new: newVal, old: oldVal };
  const serializedBody = JSON.stringify(body, (_, v) => (typeof v === "bigint" ? Number(v) : v));

  if (option.dryRun) {
    info(`Dry run: ${collection} ${newVal.id} would be imported.`);
    return 1;
  }
  const res = await fetch(urlJoin(option.url, `/admin/${collection}/cas`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `admin_token=${option.token}`,
    },
    body: serializedBody,
  });
  if (res.status !== 200) {
    error(`Failed to import ${collection} ${newVal.id}: ${res.statusText}`);
    return 0;
  }
  success(`Imported ${collection} ${newVal.id}.`);
  return 1;
}
