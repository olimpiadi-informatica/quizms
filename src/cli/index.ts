import { env, exit } from "node:process";

import arg from "arg";

import bundle from "./bundle";

const USAGE = `Usage: quizms [options] <command>

Commands:
  bundle            Create a bundle from the contest file.

Options:
  -h, --help        Show this help message and exit.`;

const BUNDLE_USAGE = `Usage: quizms bundle [options] <contest-file>

Options:
  --variant         The seed representing the variant of the contest to bundle.
                    If not specified, problems and answers are not randomized.`;

function bundleMain(argv: string[]) {
  const bundleArgs = arg(
    {
      "--variant": String,
    },
    { argv },
  );

  if (bundleArgs._.length !== 1) {
    console.log(BUNDLE_USAGE);
    exit(1);
  }

  if (bundleArgs["--variant"]) {
    env.QUIZMS_VARIANT = bundleArgs["--variant"];
  }

  void bundle(bundleArgs._[0]);
}

function main() {
  const args = arg(
    {
      "--help": Boolean,
      "-h": "--help",
    },
    {
      stopAtPositional: true,
    },
  );

  if (args["--help"]) {
    console.log(USAGE);
    exit(0);
  }

  if (args._.length === 0) {
    console.log(USAGE);
    exit(1);
  }

  if (args._[0] === "bundle") {
    bundleMain(args._.slice(1));
  } else {
    console.log(USAGE);
    exit(1);
  }
}

main();
