import { readFile, rm } from "node:fs/promises";
import { argv, exit } from "node:process";

import { Command } from "commander";
import glob from "fast-glob";
import less from "less";
import { build } from "tsup";

/** @type {import("esbuild").Plugin} */
const lessPlugin = {
  name: "less",
  setup(build) {
    build.onLoad({ filter: /\.less$/ }, async (args) => {
      const content = await readFile(args.path, "utf8");
      const { css } = await less.render(content, { filename: args.path });
      return { contents: css, loader: "css" };
    });
  },
};

/** @type {import("tsup").Options} */
const commonConfig = {
  format: "esm",
  sourcemap: true,
  external: [/^virtual:/],
};

/** @type {import("tsup").Options} */
const webConfig = {
  ...commonConfig,
  entryPoints: glob.sync("src/web/*/index.ts"),
  platform: "browser",
  loader: { ".css": "copy" },
  minifyWhitespace: false,
};

/** @type {import("tsup").Options} */
const cliConfig = {
  ...commonConfig,
  entryPoints: glob.sync("src/{cli,jsx-runtime}/index.ts"),
  target: "esnext",
  platform: "node",
  loader: { ".rules": "file" },
};

/** @type {import("tsup").Options} */
const cssConfig = {
  ...commonConfig,
  entryPoints: ["src/web/css/index.css"],
  esbuildPlugins: [lessPlugin],
};

const command = new Command();

command
  .command("build")
  .description("Create a production build")
  .action(async () => {
    await rm("dist", { recursive: true, force: true });
    await Promise.all(
      [webConfig, cliConfig, cssConfig].map((config) => {
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
      [webConfig, cliConfig, cssConfig].map((config) => {
        return build({
          watch: true,
          ...config,
          ...(config.platform === "browser" ? { onSuccess: () => void build(cssConfig) } : {}),
        });
      }),
    );
  });

try {
  await command.parseAsync(argv);
} catch {
  exit(1);
}
