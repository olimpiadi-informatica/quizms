import { cwd } from "node:process";

import { InvalidArgumentError, program } from "commander";
import "dotenv/config";

import firebaseCommand from "~/cli/firebase";

import devServer from "./dev";
import staticExport from "./export";
import exportVariantsCli from "./export-variants";
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
    .option(
      "-g, --config <config>",
      "The relative path of the generation config",
      "data/generation.json",
    )
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "pdf")
    .option("-c, --contestId <contestId>", "The id of the contest to print", "BORTOLIN")
    .option("-s, --server", "Do not print, only serve the pages")
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => void pdf({ dir, ...options }));

  program
    .command("export-variants")
    .description("generate the variants and their relative solutions.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option(
      "-g, --config <config>",
      "The relative path of the generation config",
      "data/generation.json",
    )
    .option(
      "-d, --outDir <directory>",
      "The directory to output the variants and the solutions.",
      "variants",
    )
    .option("-c, --contest <contestId>", "The id of the contest to print")
    .action((dir, options) => void exportVariantsCli({ dir, ...options }));

  program.addCommand(firebaseCommand());

  program.parse();
}

main();
