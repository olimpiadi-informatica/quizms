import { InvalidArgumentError, program } from "commander";

import bundle from "./bundle";
import devServer from "./dev";

function safeParseInt(value: string): number {
  const parsedValue = parseInt(value);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Argument must be a number.");
  }
  return parsedValue;
}

function main() {
  program
    .command("bundle")
    .description("Create a bundle with all question.")
    .argument("[directory]", "The directory of the contest.")
    .option("-v, --variant <variant>", "The seed used to generate the variant of the contest.")
    .action((dir, options) => void bundle({ dir, ...options }));

  program
    .command("dev")
    .description("Start a development server for the contest.")
    .argument("[directory]", "The directory of the contest.")
    .option("-p, --port <port>", "The port to use for the server.", safeParseInt, 1234)
    .action((dir, options) => void devServer({ dir, ...options }));

  program.parse();
}

main();
