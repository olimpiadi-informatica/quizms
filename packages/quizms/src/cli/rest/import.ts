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
import { fatal, info, success, warning } from "~/utils/logs";
import validate from "~/utils/validate";
import { userdataToRest } from "~/web/rest/common/converters";
import type { Contest as RestContest } from "~/web/rest/quizms-backend/bindings/Contest";
import type { Problem } from "~/web/rest/quizms-backend/bindings/Problem";
import type { StudentData } from "~/web/rest/quizms-backend/bindings/StudentData";
import type { Variant } from "~/web/rest/quizms-backend/bindings/Variant";
import type { Venue } from "~/web/rest/quizms-backend/bindings/Venue";

type ImportOptions = {
  config: string;

  url: string;
  token: string;
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
  if (options.statements) {
    await importStatements(options);
  }
  success("All done!");
}

function importAdmins(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importContests(options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  info(`Importing ${contests.length} contests...`);
  await Promise.all(
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
      await cas(options, "contest", { new: restContest });
    }),
  );
}

async function importParticipations(options: ImportOptions) {
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);
  const participations = await getParticipations(contests, schools, {}); // TODO: add teacherIds
  info(`Importing ${participations.length} participations...`);
  await Promise.all(
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
      await cas(options, "venue", { new: venue });
    }),
  );
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
  await Promise.all(
    students.map(async (student) => {
      const participation = participations.find(
        (p) => p.schoolId === student.schoolId && p.contestId === student.contestId,
      );
      if (!participation) {
        fatal(`Cannot find participation for student ${student.token}`);
      }
      const restStudent: StudentData = {
        ...student,
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
      await cas(options, "student_data", { new: restStudent });
    }),
  );
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
    const restVariant: Variant = {
      id: variant.id,
      contestId: variant.contestId,
      problems: {},
      pdf: null, // TODO: set correctly
      statement: statement,
      version: BigInt(0), // TODO: set correctly
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
  await Promise.all([
    ...restVariants.map(async (variant) => {
      await cas(options, "variant", { new: variant });
    }),
    ...Object.values(problems).map(async (problem) => {
      await cas(options, "problem", { new: problem });
    }),
  ]);
}

async function importStatements(options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  const variantsConfig = await load("variants", variantsConfigSchema);

  await Promise.all(
    contests.map(async (contest) => {
      const config = variantsConfig.find((c) => c.id === contest.id);
      if (!config) {
        fatal(`Missing variants configuration for contest ${contest.id}.`);
      }

      info(`Importing statements for contest ${contest.id}...`);
      await Promise.all(
        [...config.variantIds, ...config.pdfVariantIds].map(async (id) => {
          const statement = await readFile(path.join("variants", config.id, `${id}.txt`), "utf-8");
          return fetch(urlJoin(options.url, "/admin/update_statement"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `admin_token=${options.token}`,
            },
            body: JSON.stringify([id, statement]),
          });
        }),
      );
    }),
  );
}

async function cas(option: ImportOptions, collection: string, body: { new: any; old?: any }) {
  const serializedBody = JSON.stringify(body, (_, v) => (typeof v === "bigint" ? Number(v) : v));
  await fetch(urlJoin(option.url, `/admin/${collection}/cas`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `admin_token=${option.token}`,
    },
    body: serializedBody,
  });
}
