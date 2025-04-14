import { Command } from "commander";
import importData from "./import";
import { updateStatements } from "./update-statement";

export default function restCommand() {
  const command = new Command("rest");

  command.description("Commands to interact with the rest backend.");

  command
    .command("import")
    .description("Import the contests data.")
    .option("-c, --config <config>", "The contests config file.")
    .option("--force", "Force reimport.")
    .option("--verbose", "Verbose output.")
    .option("--dryRun", "Dry run.")
    .option("--url <url>", "Api url.")
    .option("--token <token>", "Admin token.")
    .option("--admins", "Import the admins.")
    .option("--contests", "Import the contests.")
    .option("--pdfs", "Import the pdf files.")
    .option("--schools", "Import the schools.")
    .option("--students", "Import the students.")
    .option("--teachers", "Import the teachers.")
    .option("--variants", "Import the variants.")
    .action(importData);

  command
    .command("statements")
    .description("Update the statements")
    .option("--verbose", "Verbose output.")
    .option("--dryRun", "Dry run.")
    .option("--url <url>", "Api url.")
    .option("--token <token>", "Admin token.")
    .action(updateStatements);
  return command;
}
