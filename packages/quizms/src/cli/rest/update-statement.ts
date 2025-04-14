import { readFile } from "node:fs/promises";
import path from "node:path";
import urlJoin from "url-join";
import { contestSchema } from "~/models";
import load from "~/models/load";
import { variantsConfigSchema } from "~/models/variants-config";
import { error, fatal, info, success } from "~/utils/logs";
import type { Variant } from "~/web/rest/quizms-backend/bindings/Variant";
type UpdateStatementOptions = {
  verbose: true;
  dryRun: true;
  token: string;
  url: string;
};

export async function updateStatements(options: UpdateStatementOptions) {
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
          const old = await fetch(urlJoin(options.url, `/admin/variant/get/${id}`), {
            method: "GET",
            headers: {
              cookie: `admin_token=${options.token}`,
            },
          });
          let oldVal: Variant | null = null;
          try {
            oldVal = await old.json();
          } catch {
            oldVal = null;
          }
          if (old.status !== 200 || oldVal == null) {
            error(`Failed to get variant ${id}: ${old.statusText}`);
            return;
          }
          if (options.verbose) {
            info(`Found variant ${id} for contest ${contest.id}.`);
            console.log(oldVal);
          }
          const statement = await readFile(path.join("variants", config.id, `${id}.txt`), "utf-8");
          const statementVersion = await readFile(path.join("variants", "version.txt"), "utf8");
          info(`Updating statement for variant ${id}...`);
          if (options.verbose) {
            console.log(statement);
          }
          if (options.dryRun) {
            success(`Would update statement for variant ${id}.`);
            return;
          }
          const res = await fetch(urlJoin(options.url, "/admin/update_statement"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `admin_token=${options.token}`,
            },
            body: JSON.stringify({
              id,
              oldVersion: oldVal.version,
              newVersion: statementVersion,
              statement,
            }),
          });
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
