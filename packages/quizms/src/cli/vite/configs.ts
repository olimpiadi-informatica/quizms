import { readFileSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

import react from "@vitejs/plugin-react-swc";
import { sumBy } from "lodash-es";
import pc from "picocolors";
import type { InlineConfig, PluginOption } from "vite";
import inspect from "vite-plugin-inspect";

import { info, warning } from "~/utils/logs";

import directives from "./directives";
import entry from "./entry";
import images from "./images";
import { statementExternals } from "./statement-externals";

export default function configs(mode: "development" | "production"): InlineConfig {
  const root = path.join(cwd(), "src");

  const packageJson = JSON.parse(readFileSync(path.join(cwd(), "package.json"), "utf8"));
  const plugins: PluginOption = (Object.keys(packageJson.dependencies) as string[])
    .filter((key) => key.startsWith("@olinfo/quizms-"))
    .map((pkg) => import(`${pkg}/vite`).then((m): PluginOption => m.default));

  return {
    configFile: false,
    root,
    mode,
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
      "process.env.QUIZMS_MODE": JSON.stringify(process.env.QUIZMS_MODE),
    },
    plugins: [plugins, directives(), images(), inspect(), react(), statementExternals(), entry()],
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
      namedExports: false,
    },
    clearScreen: false,
    server: {
      host: false,
    },
  };
}
