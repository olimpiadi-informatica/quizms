import { existsSync } from "node:fs";

import type { Bucket } from "@google-cloud/storage";
import { confirm } from "@inquirer/prompts";
import { fatal, success, withProgress } from "@olinfo/quizms/utils-node";
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
  const existingFiles = new Set<string>();

  await withProgress(files, files.length, async ([local, remote]) => {
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
  });

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

  await withProgress(filesToImport, filesToImport.length, ([local, remote]) =>
    bucket.upload(local, { destination: remote }),
  );

  success(`${filesToImport.length} ${collection} imported!`);
}
