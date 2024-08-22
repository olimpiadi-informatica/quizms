import { existsSync } from "node:fs";

import type { Bucket } from "@google-cloud/storage";
import { upperFirst } from "lodash-es";
import pc from "picocolors";

import { confirm, fatal, success } from "~/utils/logs";

type ImportOptions = {
  force?: true;
};

export async function importStorage(
  bucket: Bucket,
  collection: string,
  files: [string, string][],
  options: ImportOptions,
) {
  if (options?.force) {
    await confirm(
      `You are about to import the ${pc.bold(
        collection,
      )}. This will overwrite any existing data, the previous data will be lost. Are you really sure?`,
    );
  }

  await Promise.all(
    files.map(async ([local, remote]) => {
      if (!existsSync(local)) {
        fatal(
          `Cannot find ${collection}. Make sure to generate them first, use \`quizms --help\` for usage.`,
        );
      }

      if (!options?.force) {
        const file = bucket.file(remote);
        const [exists] = await file.exists().catch(() => [false]);
        if (exists) {
          fatal(
            `File already exists in \`${collection}\`. Use \`--force\` to overwrite existing documents.`,
          );
        }
      }

      await bucket.upload(local, {
        destination: remote,
      });
    }),
  );

  success(`${upperFirst(collection)} imported!`);
}
