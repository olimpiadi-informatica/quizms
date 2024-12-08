import { rm } from "node:fs/promises";
import { argv, exit } from "node:process";

import { Command } from "commander";
import { glob } from "tinyglobby";
import { build } from "tsup";

/** @type {import("tsup").Options} */
const commonConfig = {
  format: "esm",
  sourcemap: true,
  external: [/^virtual:/],
};

/** @type {import("tsup").Options} */
const webConfig = {
  ...commonConfig,
  entry: await glob("src/web/**/index.ts"),
  platform: "browser",
  minifyWhitespace: false,
  loader: { ".css": "copy" },
  banner: {
    js: "\"use client\";",
  },
};

/** @type {import("tsup").Options} */
const cliConfig = {
  ...commonConfig,
  entry: { cli: "src/cli/index.ts" },
  target: "esnext",
  platform: "node",
  loader: { ".rules": "text" },
};

const command = new Command();

command
  .command("build")
  .description("Create a production build")
  .action(async () => {
    await rm("dist", { recursive: true, force: true });
    await Promise.all(
      [webConfig, cliConfig].map((config) => {
        return build({
          minifyIdentifiers: true,
          minifySyntax: true,
          minifyWhitespace: true,
          dts: true,
          ...config,
        });
      }),
    );
  });

command
  .command("watch")
  .description("Watch for changes and rebuild")
  .action(async () => {
    await Promise.all(
      [webConfig, cliConfig].map((config) => {
        return build({ ...config, watch: true });
      }),
    );
  });

try {
  await command.parseAsync(argv);
} catch {
  exit(1);
}
