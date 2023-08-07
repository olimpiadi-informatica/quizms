import fs from "node:fs/promises";
import { argv } from "node:process";

import { Command } from "commander";
import { build, context } from "esbuild";
import less from "less";
import _ from "lodash";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

function merge(...objects) {
  const result = {};
  for (const object of objects) {
    _.mergeWith(result, object, (a, b) => {
      if (_.isArray(a)) {
        return a.concat(b);
      }
    });
  }
  return result;
}

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

/** @type {import("esbuild").Plugin} */
const importPlugin = {
  name: "import",
  setup(build) {
    build.initialOptions.write = false;

    build.onEnd(async (result) => {
      await Promise.all(
        result.outputFiles.map(async (file) => {
          if (file.path.endsWith(".js")) {
            const text = file.text.replace(/\bimport\((\w+)\)/g, "import(/* @vite-ignore */ $1)");
            const encoder = new TextEncoder();
            file.contents = encoder.encode(text);
          }
          await fs.writeFile(file.path, file.contents);
        }),
      );
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
  plugins: [importPlugin],
};

/** @type {import("esbuild").BuildOptions} */
const cliConfig = {
  ...commonConfig,
  entryPoints: ["src/cli/index.ts"],
  packages: "external",
  platform: "node",
  outfile: "dist/cli.js",
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
    const cliCtx = await context(cliConfig);
    await cliCtx.watch();

    const cssCtx = await context(cssConfig);
    await cssCtx.watch();

    /** @type {import("esbuild").Plugin} */
    const watchPlugin = {
      name: "watch",
      setup(build) {
        build.onEnd(() => void cssCtx.rebuild());
      },
    };

    const uiCtx = await context(merge(uiConfig, { plugins: [watchPlugin] }));
    await uiCtx.watch();
  });

try {
  await command.parseAsync(argv);
} catch (error) {
  process.exit(1);
}
