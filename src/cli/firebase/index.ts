import { Command, Option } from "commander";

import definalize from "./definalize";
import exportData from "./export";
import importData from "./import";
import init from "./init";

export default function firebaseCommand() {
  const command = new Command("firebase");

  command.description("Commands to interact with the Firebase database.");

  command
    .command("init")
    .description("Initialize the Firebase project.")
    .option("--force", "Overwrite existing files.")
    .action(init);

  command
    .command("export")
    .description("Export the contests data.")
    .option("--contests", "Export the contests.")
    .option("--participations", "Export the participations.")
    .option("--students", "Export the students.")
    .option("--submissions", "Export the submissions.")
    .option("--tokens", "Export the tokens.")
    .option("--variants", "Export the variants.")
    .action(exportData);

  command
    .command("import")
    .description("Import the contests data.")
    .option("-c, --config <config>", "The contests config file.")
    .option("--admins", "Import the admins.")
    .option("--contests", "Import the contests.")
    .option("--pdfs", "Import the pdf files.")
    .option("--schools", "Import the schools.")
    .option("--statements", "Import the statements.")
    .option("--students", "Import the students.")
    .option("--teachers", "Import the teachers.")
    .option("--variant-mappings", "Import the variant mappings.")
    .option("--variants", "Import the variants.")
    .option("-d, --delete", "Delete existing collections.")
    .addOption(new Option("-s, --skip-existing", "Skip existing files.").conflicts(["--delete"]))
    .addOption(
      new Option("-f, --force", "Overwrite existing documents.").conflicts([
        "--delete",
        "--skip-existing",
      ]),
    )
    .action(importData);

  command.command("definalize").description("Definalize all participations.").action(definalize);

  return command;
}
