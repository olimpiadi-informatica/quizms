import { join } from "node:path";
import { promisify } from "node:util";

import { mapValues } from "lodash-es";
import { InlineConfig, PluginOption, mergeConfig, preview } from "vite";

import { Statement } from "~/models";
import { GenerationConfig, generationConfigSchema } from "~/models/generationConfig";

import { readCollection } from "./utils/parser";
import { buildVariants } from "./variants";
import configs from "./vite/configs";

export type PdfOptions = {
  dir: string;
  config: string;
  outDir: string;
  server: boolean;
};

export default async function pdf(options: PdfOptions) {
  process.env.QUIZMS_MODE = "pdf";

  // TODO: config file option
  const generationConfigs = await readCollection("contests", generationConfigSchema);

  const root = join(options.dir, "src");
  const variants = await buildVariants(root, generationConfigs);

  const serverConfig = mergeConfig(configs(root, "production"), {
    plugins: [variantPlugin(mapValues(variants, 1), generationConfigs)],
  } as InlineConfig);
  const server = await preview(serverConfig);

  if (options.server) return;

  const url = server.resolvedUrls.local[0];
  // TODO: generate PDF

  await promisify(server.httpServer.close)();
}

function variantPlugin(
  statements: Record<string, Statement>,
  generationConfigs: GenerationConfig[],
): PluginOption {
  return {
    name: "variant-plugin",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
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
        if (url.pathname === "/pdf/contest.json") {
          const contest = url.searchParams.get("c");
          const config = generationConfigs.find((c) => c.id === contest);
          if (!config) {
            res.writeHead(400);
            res.end("Invalid contest parameter");
            return;
          }

          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(config));
          return;
        }
        next();
      });
    },
  };
}
