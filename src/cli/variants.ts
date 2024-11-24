import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { toJs } from "estree-util-to-js";
import { uniq } from "lodash-es";
import { name as quizmsImportSource } from "package.json";
import { temporaryDirectoryTask } from "tempy";
import { type InlineConfig, build, mergeConfig, transformWithEsbuild } from "vite";

import { type ExpressionWrapper, shuffleStatement } from "~/jsx-runtime/parser";
import { cleanStatement, getSchema } from "~/jsx-runtime/shuffle";
import type { Variant } from "~/models";
import load from "~/models/load";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { fatal, info, success } from "~/utils/logs";

import configs from "./vite/configs";

function buildBaseStatements(
  generationConfigs: VariantsConfig[],
): Promise<Record<string, () => ExpressionWrapper>> {
  return temporaryDirectoryTask(async (outDir) => {
    const entry = Object.fromEntries(generationConfigs.map((c) => [c.id, c.entry]));

    const bundleConfig = mergeConfig(
      configs("production", {
        mdx: {
          providerImportSource: `${quizmsImportSource}/jsx-runtime`,
          jsxImportSource: quizmsImportSource,
        },
      }),
      {
        build: {
          copyPublicDir: false,
          outDir,
          emptyOutDir: true,
          lib: {
            entry,
            fileName: "base-statement-[name]",
            formats: ["es"],
          },
          rollupOptions: {
            external: /^node:/,
          },
        },
      } as InlineConfig,
    );

    try {
      await build(bundleConfig);
    } catch {
      fatal("Build failed.");
    }

    return Object.fromEntries(
      await Promise.all(
        generationConfigs.map(async (c) => {
          const statementUrl = pathToFileURL(path.join(outDir, `base-statement-${c.id}.mjs`));
          const { default: baseStatement } = await import(statementUrl.href);
          info(`Statement for \`${c.id}\` built.`);

          return [c.id, baseStatement];
        }),
      ),
    );
  });
}

export async function buildVariants(
  configs: VariantsConfig[],
): Promise<Record<string, [Variant, string]>> {
  const baseStatements = await buildBaseStatements(configs);

  const variants: Record<string, [Variant, string]> = {};
  for (const config of configs) {
    const ids = uniq([...config.variantIds, ...config.pdfVariantIds]);
    for (const id of ids) {
      const seed = `${config.secret}-${id}`;
      const variantAst = shuffleStatement(baseStatements[config.id], seed, config);
      const schema = getSchema(variantAst);
      cleanStatement(variantAst);

      const statement = await transformWithEsbuild(toJs(variantAst).value, `statement-${id}.js`, {
        minify: true,
        charset: "utf8",
      });

      variants[id] = [{ id, schema, contestId: config.id }, statement.code];
    }
  }
  return variants;
}

export type ExportVariantsOptions = {
  config: string;
  outDir: string;
};

export default async function variants(options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  if (!existsSync("src")) {
    fatal("Invalid directory. Make sure you're inside a QuizMS project.");
  }

  const variantsConfig = await load("variants", variantsConfigSchema);
  const variants = await buildVariants(variantsConfig);

  const res = await Promise.all(
    Object.values(variants).map(async ([variant, statement]) => {
      const dir = path.join(options.outDir, variant.id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "schema.json"), JSON.stringify(variant));
      await writeFile(path.join(dir, "statement.js"), statement);
    }),
  );

  success(`Export of ${res.length} variants completed.`);
}
