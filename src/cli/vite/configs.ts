import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import { InlineConfig, splitVendorChunkPlugin } from "vite";

import { mdxOptions } from "~/mdx";

import asymptote from "./asymptote";

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

export default function (mode: "development" | "production"): InlineConfig {
  return {
    configFile: false,
    mode,
    envPrefix: "QUIZMS_",
    resolve: {
      alias: {
        vm: "vm-browserify",
      },
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      asymptote(),
      { enforce: "pre", ...mdx(mdxOptions) },
      react({ plugins: swcPlugins }),
      splitVendorChunkPlugin(),
    ],
  };
}
