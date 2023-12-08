import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { createContestAst } from "~/jsx-runtime/parser";
import { getAnswers } from "~/jsx-runtime/variants";

import readVariantIds from "./read-variant-ids";
import configs from "./vite/configs";

export async function exportAnswers(dir: string, contest: string, variant_ids: string[]) {
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

  const answers: { [key: string]: { [key: string]: string } } = {};
  for (let variant_id of variant_ids) {
    const variantAst = createContestAst(contestJsx, variant_id);
    const variantAnswers = getAnswers(variantAst, false);
    answers[variant_id] = variantAnswers;
  }
  return answers;
}

export type ExportAnswersOptions = {
  dir: string;
  outFile: string;
  variants: string;
  secret: string;
  contest: string;
};

export default async function exportAnswersCli(options: ExportAnswersOptions) {
  const variants = await readVariantIds(options.variants, options.secret);
  const answers = await exportAnswers(options.dir, options.contest, variants);
  await writeFile(options.outFile, JSON.stringify(answers), "utf-8");
}
