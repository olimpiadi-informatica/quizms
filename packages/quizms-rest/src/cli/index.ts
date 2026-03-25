import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { chdir, cwd, exit } from "node:process";

import { fatal } from "@olinfo/quizms/utils-node";
import { Option, program } from "commander";
import { version } from "package.json";

import importData from "./import";

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
  program.addHelpText("beforeAll", `QuizMS-rest cli v${version}\n`);
  program.name("quizms-rest");
  program.version(version);

  program
    .command("import")
    .description("Import the contests data.")
    .option("--contests", "Import the contests.")
    .option("--venues", "Import the venues.")
    .option("--statements", "Import the statements.")
    .option("--students", "Import the students.")
    .option("--variants", "Import the variants.")
    .option("-d, --delete", "Delete existing collections.")
    .requiredOption("--api-url <string>", "Base api url.")
    .requiredOption("--admin-token <string>", "Admin token.")
    .addOption(new Option("-s, --skip-existing", "Skip existing files.").conflicts(["--delete"]))
    .addOption(
      new Option("-f, --force", "Overwrite existing documents.").conflicts([
        "--delete",
        "--skip-existing",
      ]),
    )
    .action(importData);

  findProjectDirectory();
  await program.parseAsync();
}

await main();
exit(0);
