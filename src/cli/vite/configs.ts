import { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import mdxPlugin from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";
import { InlineConfig, splitVendorChunkPlugin } from "vite";

import { mdxOptions } from "~/mdx";

import images from "./images";

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
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      images(),
      { enforce: "pre", ...mdxPlugin({ ...mdxOptions, ...options?.mdx }) },
      react({ plugins: swcPlugins }),
      splitVendorChunkPlugin(),
    ],
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
