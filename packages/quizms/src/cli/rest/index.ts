import { Command } from "commander";
import importData from "./import";
import { addStatement, updateCurrentVersion } from "./update-statement";
import { updateWindow } from "./window";

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
    .option("--authorization <authorization>", "Authorization header.")
    .requiredOption("--url <url>", "Api url.")
    .requiredOption("--token <token>", "Admin token.")
    .option("--admins", "Import the admins.")
    .option("--contests", "Import the contests.")
    .option("--pdfs", "Import the pdf files.")
    .option("--schools", "Import the schools.")
    .option("--students", "Import the students.")
    .option("--teachers", "Import the teachers.")
    .option("--variants", "Import the variants.")
    .action(importData);

  const statementCommand = command.command("statement");
  statementCommand
    .command("add")
    .description("Add a statement version")
    .option("--verbose", "Verbose output.")
    .option("--dryRun", "Dry run.")
    .option("--authorization <authorization>", "Authorization header.")
    .requiredOption("--url <url>", "Api url.")
    .requiredOption("--token <token>", "Admin token.")
    .action(addStatement);

  statementCommand
    .command("update")
    .description("Update the current version")
    .option("--verbose", "Verbose output.")
    .option("--dryRun", "Dry run.")
    .option("--authorization <authorization>", "Authorization header.")
    .requiredOption("--url <url>", "Api url.")
    .requiredOption("--token <token>", "Admin token.")
    .action(updateCurrentVersion);

  const windowCommand = command.command("window");

  windowCommand
    .command("update")
    .description("Update the window for a venue or a student.")
    .option("--force", "Force reimport.")
    .option("--verbose", "Verbose output.")
    .option("--dryRun", "Dry run.")
    .option("--authorization <authorization>", "Authorization header.")
    .requiredOption("--url <url>", "Api url.")
    .requiredOption("--token <token>", "Admin token.")
    .option("--venue <venue>", "Update window for all stuents in the venue <venue>")
    .option("--student <student>", "Update window for a single student with token <student>.")
    .option("--file <file>", "Update for all students in the file <file>.")
    .requiredOption("--startingTime <startingTime>", "Starting time of the contest.")
    .option("--duration <duration>", "Duration of the contest in minutes.")
    .option("--endingTime <endingTime>", "Ending time of the contest.")
    .action(updateWindow);

  return command;
}
