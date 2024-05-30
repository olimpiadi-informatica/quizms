import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { mapValues, noop } from "lodash-es";
import pc from "picocolors";
import { InlineConfig, PluginOption, build, mergeConfig, preview } from "vite";

import { GenerationConfig, generationConfigSchema } from "~/models/generation-config";
import load from "~/models/load";
import { fatal, info, success } from "~/utils/logs";

import generatePdfs from "./pdf";
import { buildVariants } from "./variants";
import configs from "./vite/configs";

export type PrintOptions = {
  dir: string;
  config: string;
  outDir: string;
  entry: string;
  server: boolean;
};

export default async function print(options: PrintOptions) {
  process.env.QUIZMS_MODE = "pdf";

  const generationConfigs = await load(options.dir, "contests", generationConfigSchema);

  const root = path.join(options.dir, "src");
  const entry = path.join(root, options.entry);
  if (!existsSync(entry)) {
    fatal(`\
Entry file ${pc.bold(pc.red(options.entry))} does not exists. \
Make sure it exists or specify a different entry file using \`--entry\`.`);
  }

  info("Building statements...");
  const variants = await buildVariants(root, generationConfigs);
  const statements = mapValues(variants, 1);

  info("Building website...");
  const buildDir = path.join(options.dir, options.outDir, ".pdf-build");
  const buildConfig = mergeConfig(configs(root, "production"), {
    publicDir: path.join(options.dir, "public"),
    build: {
      outDir: buildDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        input: { print: `virtual:react-entry?src=${encodeURIComponent(options.entry)}` },
      },
    },
    plugins: [resolveContestsHelperPlugin(generationConfigs)],
    logLevel: "info",
  } as InlineConfig);
  try {
    await build(buildConfig);
  } catch {
    fatal("Build failed.");
  }

  const serverConfig = mergeConfig(configs(options.dir, "production"), {
    build: {
      outDir: buildDir,
    },
    plugins: [printPlugin(statements)],
  } as InlineConfig);
  const server = await preview(serverConfig);
  const url = server.resolvedUrls!.local[0] + options.entry.replace(/\.\w+?$/, "");

  if (options.server) {
    success(`Server started: ${pc.bold(pc.cyan(url))}`);
    await new Promise(noop);
  }

  await generatePdfs(generationConfigs, url, options.outDir);

  await promisify(server.httpServer.close.bind(server.httpServer))();
  await rm(buildDir, { recursive: true });
}

function resolveContestsHelperPlugin(generationConfigs: GenerationConfig[]): PluginOption {
  return {
    name: "quizms:resolve-contest-helper",
    apply: "build",
    configResolved(config) {
      const plugin = config.plugins.find((plugin) => plugin.name === "quizms:resolve-contest")!;
      plugin.api.contests = generationConfigs;
    },
  };
}

function printPlugin(statements: Record<string, string>): PluginOption {
  return {
    name: "quizms:print",
    apply: "serve",
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        if (url.pathname === "/pdf/statement.js") {
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
