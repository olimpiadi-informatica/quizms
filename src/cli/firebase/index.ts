import { Command } from "commander";

import danger from "./danger";
import exportContests from "./export";
import importContests from "./import";

export default function firebaseCommand() {
  const command = new Command("firebase");

  command.description("commands to interact with the Firebase database.");

  command
    .command("danger")
    .description("dangerous commands to interact with the Firebase database.")
    .action(() => void danger());

  command
    .command("export")
    .description("export the contests.")
    .option("--schools", "Export the schools.")
    .option("--solutions", "Export the solutions.")
    .option("--students", "Export the students.")
    .option("--submissions", "Export the submissions.")
    .option("--tokens", "Export the tokens.")
    .option("--variants", "Export the variants.")
    .action((options) => void exportContests(options));

  command
    .command("import")
    .description("import the contests, the variants and the teachers.")
    .option("-g, --config <config>", "Specify generation config", "data/generation.json")
    .option("-t, --teachers", "Import the teachers.")
    .option("-s, --schools", "Import the schools.")
    .option("-c, --contests", "Import the contests.")
    .option("-v, --variants", "Import the variants.")
    .option("-z, --solutions", "Import the solutions.")
    .option("-m, --mappings", "Import the variant mappings.")
    .option("-p, --pdfs", "Import the pdf files.")
    .option("-d, --delete", "Delete existing collections")
    .option("-a, --all", "Import everything.")
    .action((options) => void importContests(options));

  return command;
}
