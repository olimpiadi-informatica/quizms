import { fileURLToPath } from "node:url";

import { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import mdxPlugin from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { InlineConfig, splitVendorChunkPlugin } from "vite";
import inspect from "vite-plugin-inspect";

import { mdxOptions } from "~/mdx";

import iframe from "./iframe";
import images from "./images";
import python from "./python";

type Options = {
  mdx?: MdxOptions;
};

export default function (mode: "development" | "production", options?: Options): InlineConfig {
  return {
    configFile: false,
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
    plugins: [
      iframe(),
      images(),
      inspect(),
      { enforce: "pre", ...mdxPlugin({ ...mdxOptions, ...options?.mdx }) },
      python(),
      react({ plugins: swcPlugins }),
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
