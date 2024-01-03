import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { transform } from "esbuild";
import { toJs } from "estree-util-to-js";
import { uniq } from "lodash-es";
import { temporaryDirectoryTask } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { ExpressionWrapper, shuffleStatement } from "~/jsx-runtime/parser";
import { cleanStatement, getSchema } from "~/jsx-runtime/shuffle";
import { Variant } from "~/models";
import { GenerationConfig, generationConfigSchema } from "~/models/generation-config";

import { fatal, info, success } from "./utils/logs";
import { readCollection } from "./utils/parser";
import configs from "./vite/configs";

function buildBaseStatements(
  root: string,
  generationConfigs: GenerationConfig[],
): Promise<Record<string, () => ExpressionWrapper>> {
  return temporaryDirectoryTask(async (outDir) => {
    const entry = Object.fromEntries(generationConfigs.map((c) => [c.id, c.entry]));

    const bundleConfig = mergeConfig(
      configs(root, "production", {
        mdx: {
          providerImportSource: "quizms/jsx-runtime",
          jsxImportSource: "quizms",
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
    } catch (e) {
      fatal("Build failed.");
    }

    return Object.fromEntries(
      await Promise.all(
        generationConfigs.map(async (c) => {
          const statementUrl = pathToFileURL(join(outDir, `base-statement-${c.id}.mjs`));
          const { default: baseStatement } = await import(statementUrl.href);
          info(`Statement for \`${c.id}\` built.`);

          return [c.id, baseStatement];
        }),
      ),
    );
  });
}

export async function buildVariants(
  root: string,
  configs: GenerationConfig[],
): Promise<Record<string, [Variant, string]>> {
  const baseStatements = await buildBaseStatements(root, configs);

  const variants: Record<string, [Variant, string]> = {};
  for (const config of configs) {
    const ids = uniq([...config.variantIds, ...config.pdfVariantIds]);
    for (const id of ids) {
      const seed = `${config.secret}-${id}`;
      const variantAst = shuffleStatement(baseStatements[config.id], seed, config);
      const schema = getSchema(variantAst);
      cleanStatement(variantAst);

      const statement = await transform(toJs(variantAst).value, {
        minify: true,
        charset: "utf8",
      });

      variants[id] = [{ id, schema, contestId: config.id }, statement.code];
    }
  }
  return variants;
}

export type ExportVariantsOptions = {
  dir: string;
  config: string;
  outDir: string;
};

export default async function variants(options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  const root = join(options.dir, "src");
  if (!existsSync(root)) {
    fatal(
      `Invalid directory. Make sure you're in the root of a QuizMS project or specify a different directory, use \`--help\` for usage.`,
    );
  }

  const generationConfigs = await readCollection(options.dir, "contests", generationConfigSchema);
  const variants = await buildVariants(root, generationConfigs);

  const res = await Promise.all(
    Object.values(variants).map(async ([variant, statement]) => {
      const dir = join(options.dir, options.outDir, variant.id);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "schema.json"), JSON.stringify(variant));
      await writeFile(join(dir, "statement.js"), statement);
    }),
  );

  success(`Export of ${res.length} variants completed.`);
}
