import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import mdxPlugin from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import pc from "picocolors";
import { visualizer } from "rollup-plugin-visualizer";
import { InlineConfig } from "vite";
import inspect from "vite-plugin-inspect";

import { mdxOptions } from "~/mdx/plugins";
import { fatal, info, warning } from "~/utils/logs";

import iframe from "./iframe";
import images from "./images";
import python from "./python";
import reactEntry from "./react-entry";
import resolveContests from "./resolve-contests";

type Options = {
  mdx?: MdxOptions;
};

export default function (
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
      alias: [
        {
          find: /^quizms\/(.*)/,
          replacement: process.env.NODE_ENV === "production" ? "@olinfo/quizms/$1" : "quizms/$1",
        },
        { find: "vm", replacement: "vm-browserify" },
      ],
      dedupe: ["react", "react-dom", "@mdx-js/react"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      resolveContests(),
      iframe(),
      images(),
      inspect(),
      { enforce: "pre", ...mdxPlugin({ ...mdxOptions, ...options?.mdx }) },
      python(),
      react({ plugins: swcPlugins }),
      reactEntry(),
      process.env.NODE_ENV !== "production" && visualizer({ filename: "dist/stats.html" }),
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
    clearScreen: false,
    server: {
      fs: {
        allow: [".", fileURLToPath(new URL("../..", import.meta.url))],
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
