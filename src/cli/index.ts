import { cwd } from "node:process";

import { InvalidArgumentError, program } from "commander";
import "dotenv/config";
import { version } from "package.json";

import firebaseCommand from "~/cli/firebase";

import devServer from "./dev";
import staticExport from "./export";
import pdf from "./pdf";
import variants from "./variants";

function safeParseInt(value: string): number {
  const parsedValue = Number(value);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Argument must be a number.");
  }
  return parsedValue;
}

async function main() {
  program.addHelpText("beforeAll", `QuizMS cli v${version}\n`);
  program.version(version);

  program
    .command("dev")
    .description("Start a development server for the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => devServer({ dir, ...options }));

  program
    .command("export")
    .description("Create a static export of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "dist")
    .option("-t, --training", "Embed the questions and the answers in the export.")
    .action((dir, options) => staticExport({ dir, ...options }));

  program
    .command("pdf")
    .description("Create a PDF of the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-c, --config <config>", "The contests config file.")
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "pdf")
    .option("-s, --server", "Only serve the pages, don't generate the PDF.")
    .action((dir, options) => pdf({ dir, ...options }));

  program
    .command("variants")
    .description("Generate variants for the contest.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-c, --config <config>", "The contests config file.")
    .option("-d, --outDir <directory>", "The directory to output the variants.", "variants")
    .action((dir, options) => variants({ dir, ...options }));

  program.addCommand(firebaseCommand());

  await program.parseAsync();
}

void main();
