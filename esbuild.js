import fs from "node:fs/promises";
import { argv } from "node:process";

import { Command } from "commander";
import { build, context } from "esbuild";
import less from "less";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

/** @type {import("esbuild").Plugin} */
const cssPlugin = {
  name: "css",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const content = await fs.readFile(args.path, "utf8");
      const { css } = await postcss([tailwindcss]).process(content, { from: args.path });
      return { contents: css, loader: "css" };
    });

    build.onLoad({ filter: /\.less$/ }, async (args) => {
      const content = await fs.readFile(args.path, "utf8");
      const { css } = await less.render(content, { filename: args.path });
      return { contents: css, loader: "css" };
    });
  },
};

/** @type {import("esbuild").BuildOptions} */
const commonConfig = {
  bundle: true,
  format: "esm",
  sourcemap: true,
  logLevel: "info",
};

/** @type {import("esbuild").BuildOptions} */
const uiConfig = {
  ...commonConfig,
  entryPoints: ["src/ui/index.ts"],
  packages: "external",
  platform: "browser",
  outfile: "dist/index.js",
  alias: {
    "~": "./src",
    vm: "vm-browserify",
  },
};

/** @type {import("esbuild").BuildOptions} */
const cliConfig = {
  ...commonConfig,
  entryPoints: ["src/cli/index.ts"],
  packages: "external",
  platform: "node",
  outfile: "dist/cli.js",
  alias: {
    "~": "./src",
  },
  loader: {
    ".wasm": "file",
  },
};

/** @type {import("esbuild").BuildOptions} */
const cssConfig = {
  ...commonConfig,
  entryPoints: ["src/css/index.css"],
  outfile: "dist/index.css",
  assetNames: "fonts/[name]-[hash]",
  plugins: [cssPlugin],
  loader: {
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
  },
};

const command = new Command();

command
  .command("build")
  .description("Create a production build")
  .action(async () => {
    for (const config of [uiConfig, cliConfig, cssConfig]) {
      await build({ ...config, minify: true });
    }
  });

command
  .command("watch")
  .description("Watch for changes and rebuild")
  .action(async () => {
    for (const config of [uiConfig, cliConfig, cssConfig]) {
      const ctx = await context(config);
      await ctx.watch();
    }
  });

try {
  await command.parseAsync(argv);
} catch (error) {
  process.exit(1);
}
