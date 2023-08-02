import { join } from "node:path";
import { cwd } from "node:process";

import mdx from "@mdx-js/rollup";
import url from "@rollup/plugin-url";
import react from "@vitejs/plugin-react-swc";
import { createServer } from "vite";

import { mdxOptions } from "@/mdx";

import asymptote from "./asymptote";

export type DevOptions = {
  dir?: string;
};

export default async function devServer(options?: DevOptions) {
  const root = join(cwd(), options?.dir ?? ".");

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

  const server = await createServer({
    root,
    configFile: false,
    mode: "development",
    resolve: {
      alias: {
        contest: "/contest",
      },
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    server: {
      port: 1234,
    },
    plugins: [
      asymptote(),
      { enforce: "pre", ...mdx(mdxOptions) },
      react({ plugins: swcPlugins }),
      url(),
    ],
  });
  await server.listen();

  server.printUrls();
}
