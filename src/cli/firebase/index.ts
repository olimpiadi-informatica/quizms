import { cwd } from "node:process";

import { Command } from "commander";

import exportData from "./export";
import importData from "./import";
import init from "./init";

export default function firebaseCommand() {
  const command = new Command("firebase");

  command.description("Commands to interact with the Firebase database.");

  command
    .command("init")
    .description("Initialize the Firebase project.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .action((dir) => init({ dir }));

  command
    .command("export")
    .description("Export the contests data.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("--contests", "Export the contests.")
    .option("--participations", "Export the participations.")
    .option("--students", "Export the students.")
    .option("--submissions", "Export the submissions.")
    .option("--tokens", "Export the tokens.")
    .option("--variants", "Export the variants.")
    .action((dir, options) => exportData({ dir, ...options }));

  command
    .command("import")
    .description("Import the contests data.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-c, --config <config>", "The contests config file.")
    .option("--contests", "Import the contests.")
    .option("--pdfs", "Import the pdf files.")
    .option("--schools", "Import the schools.")
    .option("--statements", "Import the statements.")
    .option("--teachers", "Import the teachers.")
    .option("--variant-mappings", "Import the variant mappings.")
    .option("--variants", "Import the variants.")
    .option("-d, --delete", "Delete existing collections.")
    .option("-f, --force", "Overwrite existing documents.")
    .action((dir, options) => importData({ dir, ...options }));

  return command;
}
