import { Command } from "commander";
import importData from "./import";

export default function restCommand() {
  const command = new Command("rest");

  command.description("Commands to interact with the Firebase database.");

  command
    .command("import")
    .description("Import the contests data.")
    .option("-c, --config <config>", "The contests config file.")
    .option("--url <url>", "Api url.")
    .option("--token <token>", "Admin token.")
    .option("--admins", "Import the admins.")
    .option("--contests", "Import the contests.")
    .option("--pdfs", "Import the pdf files.")
    .option("--schools", "Import the schools.")
    .option("--statements", "Import the statements.")
    .option("--students", "Import the students.")
    .option("--teachers", "Import the teachers.")
    .option("--variants", "Import the variants.")
    .action(importData);

  return command;
}
