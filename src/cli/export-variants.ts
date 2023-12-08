import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { toJs } from "estree-util-to-js";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { createContestAst } from "~/jsx-runtime/parser";
import { getAnswers } from "~/jsx-runtime/variants";

import readVariantIds from "./read-variant-ids";
import configs from "./vite/configs";

type AnswersDict = Record<string, Record<string, string>>;

type VariantsDict = Record<string, string>;

export async function exportAnswers(
  dir: string,
  contest: string,
  variant_ids: string[],
): Promise<[AnswersDict, VariantsDict]> {
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

  const answers: AnswersDict = {};
  const variants: VariantsDict = {};
  for (const variant_id of variant_ids) {
    const variantAst = createContestAst(contestJsx, variant_id);
    answers[variant_id] = getAnswers(variantAst, true);
    variants[variant_id] = toJs(variantAst).value;
  }
  return [answers, variants];
}

export type ExportAnswersOptions = {
  dir: string;
  outDir: string;
  outFile: string;
  variants: string;
  secret: string;
  contest: string;
};

export default async function exportAnswersCli(options: ExportAnswersOptions) {
  const variantIds = await readVariantIds(options.variants, options.secret);
  const [answers, variants] = await exportAnswers(options.dir, options.contest, variantIds);

  await mkdir(options.outDir, { recursive: true });

  const answersFilePath = join(options.outDir, options.outFile);
  await writeFile(answersFilePath, JSON.stringify(answers), "utf-8");

  for (const variantId of variantIds) {
    const variant = variants[variantId];
    const variantFilePath = join(options.outDir, `${variantId}.js`);
    await writeFile(variantFilePath, variant, "utf-8");
  }
}
