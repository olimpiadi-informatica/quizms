import mdx from "@mdx-js/rollup";
import replace from "@rollup/plugin-replace";
import url from "@rollup/plugin-url";
import react from "@vitejs/plugin-react-swc";
import { InlineConfig } from "vite";

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
      },
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    plugins: [
      asymptote(),
      { enforce: "pre", ...mdx(mdxOptions) },
      react({ plugins: swcPlugins }),
      replace({
        preventAssignment: true,
        values: {
          "process.env.NODE_ENV": `"${mode}"`,
        },
      }),
      url(),
    ],
  };
}
