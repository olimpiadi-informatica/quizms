import { readFile } from "node:fs/promises";
import path from "node:path";
import urlJoin from "url-join";
import { contestSchema } from "~/models";
import load from "~/models/load";
import { variantsConfigSchema } from "~/models/variants-config";
import { error, fatal, info, success } from "~/utils/logs";
type UpdateStatementOptions = {
  verbose?: true;
  dryRun?: true;
  authorization?: string;
  token: string;
  url: string;
};

export async function updateCurrentVersion(options: UpdateStatementOptions) {
  const contests = await load("contests", contestSchema);
  const variantsConfig = await load("variants", variantsConfigSchema);

  await Promise.all(
    contests.map(async (contest) => {
      const config = variantsConfig.find((c) => c.id === contest.id);
      if (!config) {
        fatal(`Missing variants configuration for contest ${contest.id}.`);
      }

      const statementVersion = await readFile(path.join("variants", "version.txt"), "utf8");
      info(`Updating current version to ${statementVersion} for contest ${contest.id}...`);
      await Promise.all(
        [...config.variantIds, ...config.pdfVariantIds].map(async (id) => {
          if (options.dryRun) {
            success(`Would update current version to ${statementVersion} for variant ${id}.`);
            return;
          }
          info(`Updating current version to ${statementVersion} for variant ${id}...`);
          const res = await fetch(
            urlJoin(options.url, `/admin/variant/${id}/set_current_version`),
            {
              method: "POST",
              headers: {
                Authorization: options.authorization!,
                "Content-Type": "application/json",
                cookie: `admin_token=${options.token}`,
              },
              body: JSON.stringify(statementVersion),
            },
          );
          if (res.status !== 200) {
            error(`Failed to update current version for variant ${id}: ${res.statusText}`);
            return;
          }
          success(`Updated current version for variant ${id}.`);
        }),
      );
    }),
  );
}

export async function addStatement(options: UpdateStatementOptions) {
  const contests = await load("contests", contestSchema);
  const variantsConfig = await load("variants", variantsConfigSchema);

  await Promise.all(
    contests.map(async (contest) => {
      const config = variantsConfig.find((c) => c.id === contest.id);
      if (!config) {
        fatal(`Missing variants configuration for contest ${contest.id}.`);
      }

      const statementVersion = await readFile(path.join("variants", "version.txt"), "utf8");
      info(`Adding new statement version ${statementVersion} to contest ${contest.id}...`);
      await Promise.all(
        [...config.variantIds, ...config.pdfVariantIds].map(async (id) => {
          const statement = await readFile(path.join("variants", config.id, `${id}.txt`), "utf-8");
          if (options.dryRun) {
            success(`Would add statement ${statementVersion} to variant ${id}.`);
            return;
          }
          info(`Adding statement ${statementVersion} to variant ${id}...`);
          const res = await fetch(
            urlJoin(options.url, `/admin/variant/${id}/add_statement_version/${statementVersion}`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: `admin_token=${options.token}`,
              },
              body: JSON.stringify(statement),
            },
          );
          if (res.status !== 200) {
            error(`Failed to update statement ${id}: ${res.statusText}`);
            return;
          }
          success(`Updated statement ${id} for contest ${contest.id}.`);
        }),
      );
    }),
  );
}
