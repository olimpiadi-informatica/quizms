import { cwd } from "node:process";

import { Command } from "commander";

import deploy from "./deploy";
import exportData from "./export";
import importData from "./import";

export default function firebaseCommand() {
  const command = new Command("firebase");

  command.description("Commands to interact with the Firebase database.");

  command
    .command("deploy")
    .description("Deploy the website.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .action((dir) => deploy({ dir }));

  command
    .command("export")
    .description("Export the contests data.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("--schools", "Export the schools.")
    .option("--solutions", "Export the solutions.")
    .option("--students", "Export the students.")
    .option("--submissions", "Export the submissions.")
    .option("--tokens", "Export the tokens.")
    .option("--variants", "Export the variants.")
    .option("--contests", "Export the contests.")
    .action((dir, options) => exportData({ dir, ...options }));

  command
    .command("import")
    .description("Import the contests data.")
    .argument("[directory]", "The directory of the contest.", cwd())
    .option("-c, --config <config>", "The contests config file.")
    .option("--teachers", "Import the teachers.")
    .option("--schools", "Import the schools.")
    .option("--contests", "Import the contests.")
    .option("--variants", "Import the variants.")
    .option("--variant-mappings", "Import the variant mappings.")
    .option("--statements", "Import the statements.")
    .option("--solutions", "Import the solutions.")
    .option("--pdfs", "Import the pdf files.")
    .option("-d, --delete", "Delete existing collections.")
    .option("-f, --force", "Overwrite existing documents.")
    .action((dir, options) => importData({ dir, ...options }));

  return command;
}
