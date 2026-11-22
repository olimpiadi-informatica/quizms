import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import { uniq } from "lodash-es";

import { type Variant, variantsConfigSchema } from "~/models";
import { hash } from "~/utils";
import {
  fatal,
  firstDifference,
  isMultilingual,
  load,
  setContestLanguages,
  withProgress,
} from "~/utils-node";

import { buildBaseClientModules } from "./variants/client-module";
import { buildBaseSchemas } from "./variants/schema";
import { buildBaseStatements } from "./variants/statement";

export type ExportVariantsOptions = {
  outDir: string;
  /** Languages from the command line, replacing the configured ones */
  languages?: string[];
};

export default async function variants(options: ExportVariantsOptions) {
  const cacheDir = path.join(cwd(), ".quizms", "cache");
  const schemaBuildDir = path.join(cwd(), ".quizms", "schema-build");
  const statementBuildDir = path.join(cwd(), ".quizms", "statement-build");
  const variantsDir = path.resolve(cwd(), options?.outDir || "variants");

  const configs = await load("variants", variantsConfigSchema);
  setContestLanguages(configs, options?.languages);

  await buildBaseSchemas(configs, schemaBuildDir);
  const baseStatement = await buildBaseStatements(configs, statementBuildDir);

  await mkdir(cacheDir, { recursive: true });
  await rm(variantsDir, { recursive: true, force: true });

  const clientModule = await buildBaseClientModules(statementBuildDir, baseStatement);

  const variants = configs.flatMap((config) =>
    uniq([...config.variantIds, ...config.pdfVariantIds]).map(
      (variant) => [config, variant] as const,
    ),
  );

  const controller = new AbortController();

  await withProgress(variants, variants.length, async ([config, variant]) => {
    const variantDir = path.join(variantsDir, config.id, variant);
    await mkdir(variantDir, { recursive: true });

    await cp(
      path.join(statementBuildDir, "dist", clientModule),
      path.join(variantDir, baseStatement.clientModule.id),
    );
    if (baseStatement.cssModule) {
      await cp(baseStatement.cssModule, path.join(variantDir, "statement.css"));
    }

    const variantHash = hash(`${config.id}-${variant}-${config.secret}`);
    const env = {
      ...process.env,
      NODE_ENV: "production",
      QUIZMS_CONTEST_ID: config.id,
      QUIZMS_VARIANT_ID: variant,
      QUIZMS_VARIANT_HASH: variantHash.toString(),
      QUIZMS_SHUFFLE_PROBLEMS: config.shuffleProblems ? "true" : undefined,
      QUIZMS_SHUFFLE_ANSWERS: config.shuffleAnswers ? "true" : undefined,
      QUIZMS_CACHE_DIR: cacheDir,
      QUIZMS_VARIANT_DIR: variantDir,
    };

    const multilingual = isMultilingual(config, options?.languages);
    const languages = options?.languages ?? config.languages;

    let defaultSchema: unknown;
    for (const language of languages) {
      const languageEnv = {
        ...env,
        QUIZMS_LANGUAGE: language,
        QUIZMS_STATEMENT_FILE: multilingual ? `statement.${language}.txt` : "statement.txt",
      };
      const label = multilingual
        ? `${config.id}/${variant} (${language})`
        : `${config.id}/${variant}`;

      try {
        await promisify(execFile)(process.execPath, ["--conditions=react-server", "server.js"], {
          cwd: statementBuildDir,
          signal: controller.signal,
          env: languageEnv,
        });
      } catch (err) {
        controller.abort();
        fatal(`Failed to build statement for variant ${label}: ${err}`);
      }

      let schema: unknown;
      try {
        const { stdout } = await promisify(execFile)(process.execPath, ["server.js"], {
          cwd: schemaBuildDir,
          signal: controller.signal,
          env: languageEnv,
        });
        schema = JSON.parse(stdout);
      } catch (err) {
        controller.abort();
        fatal(`Failed to build schema for variant ${label}: ${err}`);
      }

      if (language === languages[0]) {
        defaultSchema = schema;
      } else {
        // Every language must be graded the same way: same problems, sub-problems, answer
        // types, option order, correct answers and points.
        const diff = firstDifference(defaultSchema, schema);
        if (diff !== undefined) {
          controller.abort();
          fatal(
            `The ${language} statement of variant ${config.id}/${variant} doesn't match the ${languages[0]} statement at ${diff}. All translations of a problem must have the same answers, in the same order, with the same correct answers.`,
          );
        }
      }
    }

    await writeFile(
      path.join(variantDir, "answers.json"),
      JSON.stringify({
        id: variant,
        isOnline: config.variantIds.includes(variant),
        isPdf: config.pdfVariantIds.includes(variant),
        contestId: config.id,
        schema: defaultSchema as Variant["schema"],
      } satisfies Variant),
    );
  });
}
