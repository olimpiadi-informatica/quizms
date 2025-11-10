import { existsSync } from "node:fs";

import type { Bucket } from "@google-cloud/storage";
import { confirm } from "@inquirer/prompts";
import { fatal, success } from "@olinfo/quizms/utils-node";
import { SingleBar } from "cli-progress";
import { partition } from "lodash-es";
import pc from "picocolors";

type ImportOptions = {
  skipExisting?: true;
  force?: true;
};

export async function importStorage(
  bucket: Bucket,
  collection: string,
  files: [string, string][],
  options: ImportOptions,
) {
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
  });

  const existingFiles = new Set<string>();

  bar.start(files.length, 0);
  await Promise.all(
    files.map(async ([local, remote]) => {
      if (!existsSync(local)) {
        fatal(
          `Cannot find ${collection}. Make sure to generate them first, use \`quizms --help\` for usage.`,
        );
      }

      const file = bucket.file(remote);
      const [exists] = await file.exists().catch(() => [false]);
      if (exists) {
        existingFiles.add(remote);
      }
      bar.increment();
    }),
  );
  bar.stop();

  const [existing, nonExisting] = partition(files, ([_, remote]) => existingFiles.has(remote));
  if (existing.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `Files already exist in \`${collection}\`. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const filesToImport = options.skipExisting ? nonExisting : [...existing, ...nonExisting];

  if (options.force && existing.length > 0) {
    const confirmed = await confirm({
      message: `You are about to import the ${pc.bold(
        collection,
      )}. ${existing.length} files will be overwritten, the previous data will be lost. Are you really sure?`,
      default: false,
    });
    if (!confirmed) {
      fatal("Command aborted.");
    }
  }

  bar.start(filesToImport.length, 0);
  await Promise.all(
    filesToImport.map(async ([local, remote]) => {
      await bucket.upload(local, { destination: remote });
      bar.increment();
    }),
  );
  bar.stop();

  success(`${filesToImport.length} ${collection} imported!`);
}
