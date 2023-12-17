import { readFile } from "node:fs/promises";

import z, { ZodType } from "zod";

import { generationConfigSchema } from "~/models/generation-config";
import validate from "~/utils/validate";

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf-8"));
}

export default async function loadGenConfig(configPath: string) {
  const configJson: any = await readJson(configPath);
  for (const contestId of Object.keys(configJson)) {
    const contest = configJson[contestId];
    contest.id = contestId;
    if (typeof contest.variantIds === "string") {
      contest.variantIds = await readJson(contest.variantIds);
    }
    if (typeof contest.pdfVariantIds === "string") {
      contest.pdfVariantIds = await readJson(contest.pdfVariantIds);
    }
  }
  return validateOrExit(generationConfigSchema, configJson);
}

function validateOrExit<In, Out, Extra extends In>(
  schema: ZodType<Out, any, In>,
  value: In,
  extra?: Extra,
): Out {
  try {
    return validate<any, Out>(
      z
        .record(z.any())
        .transform((record) => ({ ...extra, ...record }))
        .pipe(schema),
      value,
    );
  } catch (e) {
    process.exit(1);
  }
}
