import mdx from "@mdx-js/rollup";
import url from "@rollup/plugin-url";
import react from "@vitejs/plugin-react-swc";
import { InlineConfig, splitVendorChunkPlugin } from "vite";

import { mdxOptions } from "~/mdx";

import asymptote from "./asymptote";

const swcPlugins: [string, Record<string, any>][] = [
  [
    "@swc/plugin-transform-imports",
    {
      contest: {
        transform: "contest/{{ kebabCase member }}/question",
      },
    },
  ],
];

export default function (mode: "development" | "production"): InlineConfig {
  return {
    configFile: false,
    mode,
    resolve: {
      alias: {
        contest: "/contest",
        vm: "vm-browserify",
      },
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    plugins: [
      asymptote(),
      { enforce: "pre", ...mdx(mdxOptions) },
      react({ plugins: swcPlugins }),
      splitVendorChunkPlugin(),
      url(),
    ],
  };
}
