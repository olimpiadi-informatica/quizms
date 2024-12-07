import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import { mapValues, noop } from "lodash-es";
import pc from "picocolors";
import { type InlineConfig, type PluginOption, build, mergeConfig, preview } from "vite";

import { type Contest, contestSchema } from "~/models";
import load from "~/models/load";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { fatal, info, success } from "~/utils/logs";

import generatePdfs from "./pdf";
import { buildVariants } from "./variants";
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

  info("Building statements...");
  process.env.QUIZMS_MODE = "contest";
  const variants = await buildVariants(variantConfigs);
  const statements = mapValues(variants, 1);

  info("Building website...");
  process.env.QUIZMS_MODE = "print";
  const buildDir = path.join(cwd(), options.outDir, ".pdf-build");
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
    plugins: [printPlugin(contests, variantConfigs, statements)],
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

function printPlugin(
  contests: Contest[],
  variantConfigs: VariantsConfig[],
  statements: Record<string, string>,
): PluginOption {
  return {
    name: "quizms:print-proxy",
    apply: "serve",
    configurePreviewServer(server) {
      server.middlewares.use("/print-proxy", (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        if (url.pathname === "/contests.json") {
          const contestConfigs = contests.map((contest) => {
            const config = variantConfigs.find((c) => c.id === contest.id);
            if (!config) {
              fatal(`Missing variants configuration for contest ${contest.id}.`);
            }
            return { ...contest, ...config };
          });

          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(contestConfigs));
          return;
        }

        if (url.pathname === "/statement.js") {
          const variant = url.searchParams.get("v");
          if (!variant || !(variant in statements)) {
            res.writeHead(400);
            res.end("Invalid variant parameter");
            return;
          }

          res.setHeader("content-type", "text/javascript");
          res.end(statements[variant]);
          return;
        }
        next();
      });
    },
  };
}
