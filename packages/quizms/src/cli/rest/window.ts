import { readFile } from "node:fs/promises";
import { z } from "zod";
import { studentSchema } from "~/models";
import load from "~/models/load";
import { error, info, success } from "~/utils/logs";
import { casRange } from "./utils/cas";

type UpdateWindowOption = {
  verbose?: true;
  dryRun?: true;
  force?: true;
  token: string;
  url: string;
  venue?: string;
  student?: string;
  file?: string;
  startingTime: string;
  duration?: number;
  endingTime?: string;
};

export async function updateWindow(options: UpdateWindowOption) {
  if (!options.endingTime && !options.duration) {
    error("Either endingTime or duration must be specified.");
    return;
  }
  info(`Updating window for ${options.venue || options.student}...`);
  const startingTime = new Date(options.startingTime);
  const endingTime = options.endingTime
    ? new Date(options.endingTime)
    : new Date(startingTime.getTime() + options.duration! * 60 * 1000);
  info(`Starting time: ${startingTime.toString()}`);
  info(`Ending time: ${endingTime.toString()}`);
  let students = await load(
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
  if (options.venue) {
    console.log(`Updating window for venue ${options.venue}`);
    students = students.filter((student) => student.schoolId === options.venue);
  } else if (options.file) {
    // read file with one token per line
    const file = await readFile(options.file, "utf8");
    const tokens = file.split("\n").map((line) => line.trim());
    console.log(`Updating window for ${tokens.length} students from file`);
    students = students.filter((student) => tokens.includes(student.token || "lol"));
    if (options.verbose) {
      console.log(students);
    }
  } else if (options.student) {
    console.log(`Updating window for student ${options.student}`);
    students = students.filter((student) => student.token === options.student);
  } else {
    error("No venue or student specified");
    return;
  }

  info(`Updating range for ${students.length} students.`);
  const res = await Promise.all(
    students.map(async (student) => {
      if (!student.token) {
        error(`Student ${student.token} has no token`);
        return;
      }
      return await casRange(options, student.token, {
        start: startingTime.toISOString(),
        end: endingTime.toISOString(),
      });
    }),
  );
  const successCount = res.filter((r) => r).length;
  success(`Updated window for ${successCount} students.`);
}
