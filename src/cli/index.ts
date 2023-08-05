import { InvalidArgumentError, program } from "commander";

import bundle from "./bundle";
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
    .command("bundle")
    .description("Create a bundle with all question.")
    .argument("[directory]", "The directory of the contest.")
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "bundle")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void bundle({ dir, ...options }));

  program
    .command("dev")
    .description("Start a development server for the contest.")
    .argument("[directory]", "The directory of the contest.")
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => void devServer({ dir, ...options }));

  program
    .command("export")
    .description("Create a static export of the contest.")
    .argument("[directory]", "The directory of the contest.")
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "dist")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void staticExport({ dir, ...options }));

  program
    .command("pdf")
    .description("Create a PDF of the contest.")
    .argument("[directory]", "The directory of the contest.")
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "pdf")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void pdf({ dir, ...options }));

  program.parse();
}

main();
