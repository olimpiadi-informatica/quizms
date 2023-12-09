import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { toJs } from "estree-util-to-js";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { createContestAst } from "~/jsx-runtime/parser";
import { getAnswers } from "~/jsx-runtime/variants";
import { Solution } from "~/models/solution";
import { Variant } from "~/models/variant";

import readVariantIds from "./read-variant-ids";
import configs from "./vite/configs";

export async function exportVariants(
  dir: string,
  contest: string,
  variant_ids: string[],
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
        entry: contest,
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
  for (const variant_id of variant_ids) {
    const variantAst = createContestAst(contestJsx, variant_id);
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
  outDir: string;
  outFile: string;
  variants: string;
  secret: string;
  contest: string;
};

export default async function exportVariantsCli(options: ExportVariantsOptions) {
  const variantIds = await readVariantIds(options.variants, options.secret);
  const { solutions, variants } = await exportVariants(options.dir, options.contest, variantIds);

  await mkdir(options.outDir, { recursive: true });

  const solutionsFilePath = join(options.outDir, options.outFile);
  await writeFile(solutionsFilePath, JSON.stringify(solutions), "utf-8");

  for (const variantId of variantIds) {
    const variant = variants[variantId];
    const variantFilePath = join(options.outDir, `${variantId}.json`);
    await writeFile(variantFilePath, JSON.stringify(variant), "utf-8");
  }
}
