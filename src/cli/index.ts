import { chdir, cwd, exit } from "node:process";

import { InvalidArgumentError, program } from "commander";
import { version } from "package.json";

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fatal } from "~/utils/logs";
import staticExport from "./build";
import devServer from "./dev";
import firebaseCommand from "./firebase";
import print from "./print";
import variants from "./variants";

function safeParseInt(value: string): number {
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new InvalidArgumentError("Argument must be a number.");
  }
  return parsedValue;
}

function findProjectDirectory() {
  const home = homedir();
  let root = cwd();
  for (;;) {
    if (existsSync(path.join(root, "package.json")) && existsSync(path.join(root, "src"))) {
      chdir(root);
      return;
    }
    const parent = path.dirname(root);
    if (parent === root || parent === home) {
      fatal("Invalid directory. Make sure you're inside a QuizMS project.");
    }
    root = parent;
  }
}

async function main() {
  program.addHelpText("beforeAll", `QuizMS cli v${version}\n`);
  program.version(version);

  program
    .command("dev")
    .description("Start a development server for the contest.")
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action(devServer);

  program
    .command("build")
    .description("Create a static export of the website.")
    .option("-d, --outDir <directory>", "The directory to output the bundle.", "dist")
    .option("-t, --training", "Embed the questions and the answers in the export.")
    .option("-l, --library", "Build the project as a library.")
    .action(staticExport);

  program
    .command("print")
    .description("Create PDFs for the contest.")
    .option("-c, --config <config>", "The contests config file.")
    .option("-d, --outDir <directory>", "The directory to output the PDF.", "variants")
    .option("-e, --entry <entry>", "The entry point of the PDF.", "print.jsx")
    .option("-s, --server", "Only serve the pages, don't generate the PDF.")
    .action(print);

  program
    .command("variants")
    .description("Generate variants for the contest.")
    .option("-c, --config <config>", "The contests config file.")
    .option("-d, --outDir <directory>", "The directory to output the variants.", "variants")
    .action(variants);

  program.addCommand(firebaseCommand());

  findProjectDirectory();
  await program.parseAsync();
}

await main();
exit(0);
