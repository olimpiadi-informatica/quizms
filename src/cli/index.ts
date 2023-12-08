import { cwd } from "node:process";

import { InvalidArgumentError, program } from "commander";
import "dotenv/config";

import firebaseCommand from "~/cli/firebase";

import devServer from "./dev";
import staticExport from "./export";
import pdf from "./pdf";

function safeParseInt(value: string): number {
  const parsedValue = parseInt(value);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Argument must be a number.");
  }
  return parsedValue;
}

function main() {
  program
    .command("dev")
    .description("start a development server for the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => void devServer({ dir, ...options }));

  program
    .command("export")
    .description("create a static export of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "dist")
    .option("-t, --training", "Embed the questions and the answers in the export.")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void staticExport({ dir, ...options }));

  program
    .command("pdf")
    .description("create a PDF of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "pdf")
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .option("-s, --server", "Do not print, only serve the pages")
    .option(
      "-c, --contest <contest>",
      "The relative path of the contest to print.",
      "contest/contest.mdx",
    )
    .option("-n, --count <count>", "The amount of variants to generate.", safeParseInt, 100)
    .action((dir, options) => void pdf({ dir, ...options }));

  program.addCommand(firebaseCommand());

  program.parse();
}

main();
