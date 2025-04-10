import { existsSync } from "node:fs";
import urlJoin from "url-join";
import { contestSchema, schoolSchema } from "~/models";
import load from "~/models/load";
import { getParticipations } from "~/models/utils";
import { fatal, success, warning } from "~/utils/logs";
import type { Contest as RestContest } from "~/web/rest/quizms-backend/bindings/Contest";
import type { Venue } from "~/web/rest/quizms-backend/bindings/Venue";
import { convertToRest } from "./utils/converters-admin";

type ImportOptions = {
  config: string;
  url: string;
  admin_token: string;

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
    await importAdmins(options);
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
    await importPdf(options);
  }
  if (options.variants) {
    await importVariants(options);
  }
  if (options.statements) {
    await importStatements(options);
  }
  success("All done!");
}

async function importAdmins(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importContests(options: ImportOptions) {
  const contests = await load("contests", contestSchema);
  await Promise.all(
    contests.map((contest) => {
      const restContest: RestContest = {
        ...contest,
        userData: [],
        onlineSettings: contest.hasOnline
          ? {
              windowRange: {
                start: contest.contestWindowStart.toString(),
                end: contest.contestWindowEnd.toString(),
              },
              duration: BigInt(contest.duration),
              allowRestarts: contest.allowRestart,
            }
          : null,
        offlineEnabled: contest.hasPdf,
        allowStudentAdd: contest.allowStudentImport,
      };
      return fetch(urlJoin(options.url, "/admin/contest/cas"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `admin_token=${options.admin_token}`,
        },
        body: JSON.stringify(convertToRest(restContest)),
      });
    }),
  );
}

async function importParticipations(options: ImportOptions) {
  const schools = await load("schools", schoolSchema);
  const contests = await load("contests", contestSchema);
  const participations = await getParticipations(contests, schools, {}); // TODO: add teacherIds
  await Promise.all(
    participations.map((participation) => {
      const venue: Venue = {
        token: participation.token || null,
        variantsToPrint: participation.pdfVariants || [],
        window: {
          start: participation.startingTime?.toString() || "",
          end: participation.endingTime?.toString() || "",
        },
        ...participation,
      };
      return fetch(urlJoin(options.url, "/admin/venue/cas"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `admin_token=${options.admin_token}`,
        },
        body: JSON.stringify(venue),
      });
    }),
  );
}

async function importStudents(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importPdf(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importVariants(_options: ImportOptions) {
  throw new Error("Function not implemented.");
}

async function importStatements(options: ImportOptions) {
}
