import { cwd } from "node:process";

import { InvalidArgumentError, program } from "commander";
import "dotenv/config";

import devServer from "./dev";
import staticExport from "./export";
import importContests from "./import";
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
    .description("Start a development server for the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => void devServer({ dir, ...options }));

  program
    .command("export")
    .description("Create a static export of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "dist")
    .option("-t, --training", "Embed the questions and the answers in the export.")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void staticExport({ dir, ...options }));

  program
    .command("import")
    .description("Import the contests, the variants and the teachers.")
    .action(() => void importContests());

  program
    .command("pdf")
    .description("Create a PDF of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "pdf")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void pdf({ dir, ...options }));

  program.parse();
}

main();
