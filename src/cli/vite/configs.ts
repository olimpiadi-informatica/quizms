import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import mdxPlugin from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import pc from "picocolors";
import preserveDirectives from "rollup-preserve-directives";
import { InlineConfig } from "vite";
import inspect from "vite-plugin-inspect";

import { mdxOptions } from "~/mdx/plugins";
import { fatal, info, warning } from "~/utils/logs";

import blocklyBlocks from "./blockly-blocks";
import blocklyMedia from "./blockly-media";
import iframe from "./iframe";
import images from "./images";
import python from "./python";
import resolveContests from "./resolve-contests";
import routes from "./routes";

type Options = {
  mdx?: MdxOptions;
};

export default function configs(
  root: string,
  mode: "development" | "production",
  options?: Options,
): InlineConfig {
  if (!existsSync(root)) {
    fatal(
      `Invalid directory. Make sure you're in the root of a QuizMS project or specify a different directory, use \`--help\` for usage.`,
    );
  }

  return {
    configFile: false,
    root,
    mode,
    envPrefix: "QUIZMS_",
    resolve: {
      alias: {
        "~": root,
        vm: "vm-browserify",
      },
      dedupe: ["react", "react-dom", "@mdx-js/react", "wouter"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      blocklyBlocks(),
      blocklyMedia(),
      iframe(),
      images(),
      inspect(),
      { enforce: "pre", ...mdxPlugin({ ...mdxOptions, ...options?.mdx }) },
      preserveDirectives(),
      python(),
      react({ plugins: swcPlugins }),
      routes(),
      resolveContests(),
    ],
    build: {
      rollupOptions: {
        onwarn: (log) => {
          if (
            (log.code === "CIRCULAR_DEPENDENCY" || log.code === "THIS_IS_UNDEFINED") &&
            (log.ids ?? [log.id]).some((id) => id?.includes("/node_modules/"))
          ) {
            return;
          }
          if (log.code === "EVAL" && log.loc?.file?.includes("vm-browserify")) return;
          let message = log.message;
          if (log.loc) {
            message += `  ${pc.blue("➜")} ${pc.bold(
              `${log.loc.file}:${log.loc.line}:${log.loc.column}`,
            )}`;

            if (log.frame) {
              message += log.frame
                .split("\n")
                .map((l) => " " + l)
                .join("\n");
            }
          }
          warning(message);
          if (log.url) {
            info(`See ${pc.bold(log.url)} for more information.`);
          }
        },
      },
    },
    css: {
      preprocessorMaxWorkers: true,
    },
    clearScreen: false,
    server: {
      fs: {
        allow: [path.join(root, ".."), fileURLToPath(new URL("../..", import.meta.url))],
      },
      host: false,
    },
  };
}

const swcPlugins: [string, Record<string, any>][] = [
  [
    "@swc/plugin-transform-imports",
    {
      problemset: {
        transform: "./{{ kebabCase member }}/question",
      },
    },
  ],
];
