import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { chdir, cwd, exit } from "node:process";

import { fatal } from "@olinfo/quizms/utils-node";
import { Option, program } from "commander";
import { version } from "package.json";

import definalize from "./definalize";
import exportData from "./export";
import importData from "./import";
import init from "./init";
import updateScores from "./update-scores";

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
  program.addHelpText("beforeAll", `QuizMS-firebase cli v${version}\n`);
  program.name("quizms-firebase");
  program.version(version);

  program
    .command("init")
    .description("Initialize the Firebase project.")
    .option("--force", "Overwrite existing files.")
    .action(init);

  program
    .command("export")
    .description("Export the contests data.")
    .option("--contests", "Export the contests.")
    .option("--participations", "Export the participations.")
    .option("--students", "Export the students.")
    .option("--submissions", "Export the submissions.")
    .option("--variants", "Export the variants.")
    .action(exportData);

  program
    .command("import")
    .description("Import the contests data.")
    .option("-c, --config <config>", "The contests config file.")
    .option("--admins", "Import the admins.")
    .option("--contests", "Import the contests.")
    .option("--schools", "Import the schools.")
    .option("--statements", "Import the statements.")
    .option("--students", "Import the students.")
    .option("--teachers", "Import the teachers.")
    .option("--variants", "Import the variants.")
    .option("--websites", "Import the websites.")
    .option("-d, --delete", "Delete existing collections.")
    .addOption(new Option("-s, --skip-existing", "Skip existing files.").conflicts(["--delete"]))
    .addOption(
      new Option("-f, --force", "Overwrite existing documents.").conflicts([
        "--delete",
        "--skip-existing",
      ]),
    )
    .action(importData);

  program.command("definalize").description("Definalize all participations.").action(definalize);
  program.command("update-scores").description("Update student scores.").action(updateScores);

  findProjectDirectory();
  await program.parseAsync();
}

await main();
exit(0);
