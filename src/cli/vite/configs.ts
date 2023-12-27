import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import mdxPlugin from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import license from "rollup-plugin-license";
import { InlineConfig, splitVendorChunkPlugin } from "vite";
import inspect from "vite-plugin-inspect";

import { fatal } from "~/cli/utils/logs";
import { mdxOptions } from "~/mdx/plugins";

import iframe from "./iframe";
import images from "./images";
import preconnect from "./preconnect";
import python from "./python";
import reactEntry from "./reactEntry";

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
      alias: {
        vm: "vm-browserify",
      },
      dedupe: ["react", "react-dom", "@mdx-js/react"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    esbuild: {
      legalComments: "external",
      banner: "/*! For licenses information, see LICENSES.txt */",
    },
    plugins: [
      license({
        thirdParty: {
          output: {
            file: "dist/LICENSES.txt", // TODO: outdir option
          },
        },
      }),
      iframe(),
      images(),
      inspect(),
      { enforce: "pre", ...mdxPlugin({ ...mdxOptions, ...options?.mdx }) },
      preconnect(),
      python(),
      react({ plugins: swcPlugins }),
      reactEntry(),
      splitVendorChunkPlugin(),
      visualizer({ filename: "dist/stats.html" }),
    ],
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
