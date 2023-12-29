import { rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { mapValues } from "lodash-es";
import pc from "picocolors";
import { InlineConfig, PluginOption, build, mergeConfig, preview } from "vite";

import { Statement } from "~/models";
import { GenerationConfig, generationConfigSchema } from "~/models/generationConfig";

import generatePdfs from "./pdf";
import { info, success } from "./utils/logs";
import { readCollection } from "./utils/parser";
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

  // TODO: config file option
  const generationConfigs = await readCollection("contests", generationConfigSchema);

  info("Building statements...");
  const root = join(options.dir, "src");
  const variants = await buildVariants(root, generationConfigs);
  const statements = mapValues(variants, 1);

  info("Building website...");
  const buildDir = join(options.dir, options.outDir, ".pdf-build");
  await build(
    mergeConfig(configs(join(options.dir, "src"), "production"), {
      publicDir: join(options.dir, "public"),
      build: {
        outDir: buildDir,
        emptyOutDir: true,
        chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
        rollupOptions: {
          input: { print: `virtual:react-entry?src=${encodeURIComponent(options.entry)}` },
        },
      },
      plugins: [resolveContestsPlugin(generationConfigs)],
      logLevel: "info",
    } as InlineConfig),
  );

  const serverConfig = mergeConfig(configs(options.dir, "production"), {
    build: {
      outDir: buildDir,
    },
    plugins: [printPlugin(statements)],
  } as InlineConfig);
  const server = await preview(serverConfig);
  const url = server.resolvedUrls!.local[0] + options.entry.replace(/\.jsx?$/, "");

  if (options.server) {
    success(`Server started: ${pc.bold(pc.cyan(url))}`);
    return;
  }

  await generatePdfs(generationConfigs, url, options.outDir);

  await promisify(server.httpServer.close.bind(server.httpServer))();
  await rm(buildDir, { recursive: true });
}

function resolveContestsPlugin(generationConfigs: GenerationConfig[]): PluginOption {
  return {
    name: "resolve-contest-plugin",
    apply: "build",
    resolveId(id) {
      if (id === "virtual:quizms-contests") {
        return "\0" + id;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-contests") {
        return `\
const contests = ${JSON.stringify(generationConfigs)};
export default contests;
`;
      }
    },
  };
}

function printPlugin(statements: Record<string, Statement>): PluginOption {
  return {
    name: "print-plugin",
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
          res.end(statements[variant].statement);
          return;
        }
        next();
      });
    },
  };
}
