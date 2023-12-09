import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { toJs } from "estree-util-to-js";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { shuffleContest } from "~/jsx-runtime/parser";
import { getAnswers } from "~/jsx-runtime/variants";
import { ContestConfig } from "~/models/generation-config";
import { Solution } from "~/models/solution";
import { Variant } from "~/models/variant";

import loadGenerationConfig from "./load-generation-config";
import configs from "./vite/configs";

export async function exportVariants(
  dir: string,
  config: ContestConfig,
): Promise<{ solutions: Record<string, Solution>; variants: Record<string, Variant> }> {
  process.env.QUIZMS_MODE = "pdf";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const outDir = temporaryDirectory();
  const fileName = "base-contest";

  const bundleConfig: InlineConfig = {
    root: join(dir, "src"),
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: config.entry,
        fileName,
        formats: ["es"],
      },
    },
  };

  await build(mergeConfig(defaultConfig, bundleConfig));
  const contestPath = join(outDir, `${fileName}.mjs`);
  const contestURL = pathToFileURL(contestPath);
  const { default: contestJsx } = await import(/* vite-ignore */ contestURL.toString());

  const solutions: Record<string, Solution> = {};
  const variants: Record<string, Variant> = {};
  for (const variant_id of config.variantIds) {
    const variantAst = shuffleContest(contestJsx, variant_id);
    const { answers, schema } = getAnswers(variantAst, true);
    variants[variant_id] = {
      id: variant_id,
      schema,
      statement: toJs(variantAst).value,
      contest: "",
    };
    solutions[variant_id] = {
      id: variant_id,
      answers,
    };
  }
  return { solutions, variants };
}

export type ExportVariantsOptions = {
  dir: string;
  config: string;
  outDir: string;
  contestId?: string;
};

export default async function exportVariantsCli(options: ExportVariantsOptions) {
  const config = await loadGenerationConfig(join(options.dir, options.config));
  const contestIds = options.contestId ? [options.contestId] : Object.keys(config);
  for (const contestId of contestIds) {
    const { solutions, variants } = await exportVariants(options.dir, config[contestId]);
    const outDir = join(options.outDir, contestId);
    await mkdir(outDir, { recursive: true });
    const solutionsFilePath = join(outDir, "answers.json");
    await writeFile(solutionsFilePath, JSON.stringify(solutions), "utf-8");
    for (const [variantId, variant] of Object.entries(variants)) {
      const variantFilePath = join(outDir, `${variantId}.json`);
      await writeFile(variantFilePath, JSON.stringify(variant), "utf-8");
    }
  }
}
