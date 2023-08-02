import mdx from "@mdx-js/rollup";
import url from "@rollup/plugin-url";
import react from "@vitejs/plugin-react-swc";
import { InlineConfig } from "vite";

import { mdxOptions } from "@/mdx";

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

const configs: InlineConfig = {
  configFile: false,
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
    url(),
  ],
};

export default configs;
