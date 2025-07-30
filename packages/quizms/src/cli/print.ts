import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import { noop } from "lodash-es";
import pc from "picocolors";
import { build, type InlineConfig, mergeConfig, type PluginOption, preview } from "vite";

import { type Contest, contestSchema } from "~/models";
import load from "~/models/load";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { fatal, info, success } from "~/utils/logs";

import generatePdfs from "./pdf";
import configs from "./vite/configs";

export type PrintOptions = {
  config: string;
  outDir: string;
  entry: string;
  server: boolean;
};

export default async function print(options: PrintOptions) {
  const contests = await load("contests", contestSchema);
  const variantConfigs = await load("variants", variantsConfigSchema);

  const entry = path.join("src", options.entry);
  if (!existsSync(entry)) {
    fatal(`\
Entry file ${pc.bold(pc.red(options.entry))} does not exists. \
Make sure it exists or specify a different entry file using \`--entry\`.`);
  }

  info("Building website...");
  process.env.QUIZMS_MODE = "print";
  const buildDir = path.join(cwd(), ".quizms", "pdf-build");
  const buildConfig = mergeConfig(configs("production"), {
    publicDir: path.join(cwd(), "public"),
    build: {
      outDir: buildDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        input: "virtual:quizms-routes",
      },
    },
    logLevel: "info",
  } as InlineConfig);
  try {
    await build(buildConfig);
  } catch {
    fatal("Build failed.");
  }

  const serverConfig = mergeConfig(configs("production"), {
    build: {
      outDir: buildDir,
    },
    plugins: [printPlugin(contests, variantConfigs)],
  } as InlineConfig);
  const server = await preview(serverConfig);
  const url = server.resolvedUrls!.local[0] + path.dirname(options.entry);

  if (options.server) {
    success(`Server started: ${pc.bold(pc.cyan(url))}`);
    await new Promise(noop);
  }

  await generatePdfs(contests, variantConfigs, url, options.outDir);

  await promisify(server.httpServer.close.bind(server.httpServer))();
  await rm(buildDir, { recursive: true });
}

function printPlugin(contests: Contest[], variantConfigs: VariantsConfig[]): PluginOption {
  const contestConfigs = contests.map((contest) => {
    const config = variantConfigs.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }
    return { ...contest, ...config };
  });

  return {
    name: "quizms:print-proxy",
    apply: "serve",
    configurePreviewServer(server) {
      server.middlewares.use("/print-proxy", async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        if (url.pathname === "/contests.json") {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(contestConfigs));
          return;
        }

        if (url.pathname === "/statement.txt") {
          const variant = url.searchParams.get("v");
          const contest = url.searchParams.get("c");
          if (!variant || !contest) {
            res.writeHead(400);
            res.end("Missing variant or contest parameter");
            return;
          }

          try {
            const statement = await readFile(
              path.join(cwd(), "variants", contest, `${variant}.txt`),
              "utf-8",
            );
            res.setHeader("content-type", "application/octet-stream");
            res.end(statement);
          } catch {
            res.writeHead(404);
            res.end("Statement not found");
          }

          return;
        }
        next();
      });
    },
  };
}
