import path from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";

import type { CompileOptions as MdxOptions } from "@mdx-js/mdx";
import react from "@vitejs/plugin-react-swc";
import { sumBy } from "lodash-es";
import pc from "picocolors";
import type { InlineConfig } from "vite";
import inspect from "vite-plugin-inspect";

import { info, warning } from "~/utils/logs";

import asymptote from "./asymptote";
import blocklyBlocks from "./blockly-blocks";
import blocklyMedia from "./blockly-media";
import directives from "./directives";
import images from "./images";
import mdx from "./mdx";
import python from "./python";
import resolveContests from "./resolve-contests";
import resolveMdxComponents from "./resolve-mdx-components";
import routes from "./routes";

type Options = {
  mdx?: MdxOptions;
};

export default function configs(
  mode: "development" | "production",
  options?: Options,
): InlineConfig {
  const root = path.join(cwd(), "src");

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
      dedupe: ["react", "react-dom", "wouter"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".md", ".mdx"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      asymptote(),
      blocklyBlocks(),
      blocklyMedia(),
      directives(),
      images(),
      inspect(),
      mdx(options?.mdx),
      python(),
      react(),
      routes(),
      resolveContests(),
      resolveMdxComponents(),
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
                .map((l) => ` ${l}`)
                .join("\n");
            }
          }
          warning(message);
          if (log.url) {
            info(`See ${pc.bold(log.url)} for more information.`);
          }
        },
        output: {
          assetFileNames: "assets/[hash:1]/[hash]-[name][extname]",
          chunkFileNames: (chunk) => {
            const dir = sumBy(chunk.name, (c) => c.charCodeAt(0)) % 20;
            return `assets/${String.fromCharCode(103 + dir)}/[hash]-[name].js`;
          },
          hashCharacters: "hex",
        },
      },
      target: "es2022",
    },
    optimizeDeps: {
      esbuildOptions: { target: "es2022" },
    },
    css: {
      preprocessorMaxWorkers: true,
    },
    json: {
      stringify: true,
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
