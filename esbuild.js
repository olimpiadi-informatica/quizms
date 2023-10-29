import fs from "node:fs/promises";
import { argv } from "node:process";

import { Command } from "commander";
import { build, context } from "esbuild";
import less from "less";
import postcss from "postcss";
import fontDisplay from "postcss-font-display";
import tailwindcss from "tailwindcss";

/** @type {import("esbuild").Plugin} */
const cssPlugin = {
  name: "css",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const content = await fs.readFile(args.path, "utf8");

      const processor = postcss([
        tailwindcss,
        fontDisplay({ test: /^KaTeX/, display: "swap", replace: false }),
      ]);
      const { css } = await processor.process(content, { from: args.path });
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
  alias: {
    "~": "./src",
  },
};

/** @type {import("esbuild").BuildOptions} */
const uiConfig = {
  ...commonConfig,
  entryPoints: ["src/ui/index.ts"],
  packages: "external",
  platform: "browser",
  splitting: true,
  outdir: "dist",
};

/** @type {import("esbuild").BuildOptions} */
const cliConfig = {
  ...commonConfig,
  entryPoints: ["src/cli/index.ts"],
  packages: "external",
  platform: "node",
  outfile: "dist/cli.js",
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

/** @type {import("esbuild").BuildOptions} */
const jsxRuntimeConfig = {
  ...commonConfig,
  entryPoints: ["src/jsx-runtime/index.ts"],
  packages: "external",
  platform: "browser",
  outfile: "dist/jsx-runtime.js",
};

const command = new Command();

command
  .command("build")
  .description("Create a production build")
  .action(async () => {
    for (const config of [uiConfig, cliConfig, cssConfig, jsxRuntimeConfig]) {
      await build({
        ...config,
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: false,
      });
    }
  });

command
  .command("watch")
  .description("Watch for changes and rebuild")
  .action(async () => {
    const cssCtx = await context(cssConfig);
    await cssCtx.watch();

    /** @type {import("esbuild").Plugin} */
    const watchPlugin = {
      name: "watch",
      setup(build) {
        build.onEnd(() => void cssCtx.rebuild());
      },
    };

    for (const config of [uiConfig, cliConfig, jsxRuntimeConfig]) {
      const ctx = await context({ ...config, plugins: [watchPlugin] });
      await ctx.watch();
    }
  });

try {
  await command.parseAsync(argv);
} catch (error) {
  process.exit(1);
}
