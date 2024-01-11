import fs from "node:fs/promises";
import { argv, exit } from "node:process";

import autoprefixer from "autoprefixer";
import { Command } from "commander";
import { build, context } from "esbuild";
import glob from "fast-glob";
import less from "less";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

/** @type {import("esbuild").Plugin} */
const cssPlugin = {
  name: "css",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const content = await fs.readFile(args.path, "utf8");

      const processor = postcss([autoprefixer, tailwindcss]);
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
const webConfig = {
  ...commonConfig,
  entryPoints: glob.sync("src/web/*/index.ts"),
  packages: "external",
  platform: "browser",
  splitting: true,
  outdir: "dist",
  loader: { ".css": "copy" },
  minifyWhitespace: false,
};

/** @type {import("esbuild").BuildOptions} */
const cliConfig = {
  ...commonConfig,
  entryPoints: ["src/cli/index.ts", "src/jsx-runtime/index.ts"],
  packages: "external",
  platform: "node",
  outdir: "dist",
  loader: { ".rules": "file" },
};

/** @type {import("esbuild").BuildOptions} */
const cssConfig = {
  ...commonConfig,
  entryPoints: ["src/web/css/index.css"],
  outfile: "dist/index.css",
  plugins: [cssPlugin],
};

const command = new Command();

command
  .command("build")
  .description("Create a production build")
  .action(async () => {
    for (const config of [webConfig, cliConfig, cssConfig]) {
      await build({
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        ...config,
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

    for (const config of [webConfig, cliConfig]) {
      const ctx = await context({
        ...config,
        plugins: [watchPlugin],
      });
      await ctx.watch();
    }
  });

try {
  await command.parseAsync(argv);
} catch (error) {
  exit(1);
}
