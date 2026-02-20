import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import { uniq } from "lodash-es";

import { type Variant, variantsConfigSchema } from "~/models";
import { hash } from "~/utils";
import { fatal, load, withProgress } from "~/utils-node";

import { buildBaseClientModules } from "./variants/client-module";
import { buildBaseSchemas } from "./variants/schema";
import { buildBaseStatements } from "./variants/statement";

export type ExportVariantsOptions = {
  outDir: string;
};

export default async function variants(options: ExportVariantsOptions) {
  const cacheDir = path.join(cwd(), ".quizms", "cache");
  const schemaBuildDir = path.join(cwd(), ".quizms", "schema-build");
  const statementBuildDir = path.join(cwd(), ".quizms", "statement-build");
  const variantsDir = options?.outDir || path.join(cwd(), "variants");

  const configs = await load("variants", variantsConfigSchema);

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
    };

    let schema: string;
    try {
      await promisify(execFile)(process.execPath, ["--conditions=react-server", "server.js"], {
        cwd: statementBuildDir,
        signal: controller.signal,
        env,
      });

      const { stdout } = await promisify(execFile)(process.execPath, ["server.js"], {
        cwd: schemaBuildDir,
        env,
      });
      schema = stdout;
    } catch (err) {
      controller.abort();
      fatal(`Failed to build variant ${config.id}/${variant}: ${err}`);
    }

    await writeFile(
      path.join(variantDir, "answers.json"),
      JSON.stringify({
        id: variant,
        isOnline: config.variantIds.includes(variant),
        isPdf: config.pdfVariantIds.includes(variant),
        contestId: config.id,
        schema: JSON.parse(schema),
      } satisfies Variant),
    );
  });
}
