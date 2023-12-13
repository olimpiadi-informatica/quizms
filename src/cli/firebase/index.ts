import { Command } from "commander";

import importContests from "./import";

export default function firebaseCommand() {
  const command = new Command("firebase");

  command.description("commands to interact with the Firebase database.");

  command
    .command("import")
    .description("import the contests, the variants and the teachers.")
    .option("-g, --config <config>", "Specify generation config", "data/generation.json")
    .option("-u, --users", "Import the users.")
    .option("-s, --schools", "Import the schools.")
    .option("-c, --contests", "Import the contests.")
    .option("-v, --variants", "Import the variants.")
    .option("-z, --solutions", "Import the solutions.")
    .option("-m, --mappings", "Import the variant mappings.")
    .option("-p, --pdfs", "Import the pdf files.")
    .option("-d, --delete", "Delete existings collections")
    .option("-a, --all", "Import everything.")
    .action((options) => void importContests(options));

  return command;
}
