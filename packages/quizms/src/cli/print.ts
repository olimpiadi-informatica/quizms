import path from "node:path";
import { cwd } from "node:process";
import { styleText } from "node:util";

import fastifyStatic, { type FastifyStaticOptions } from "@fastify/static";
import { detect } from "detect-port";
import Fastify, { type RegisterOptions } from "fastify";
import { noop } from "lodash-es";
import {
  build,
  type InlineConfig,
  mergeConfig,
  type PluginOption,
  transformWithEsbuild,
} from "vite";

import { type Contest, contestSchema } from "~/models";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { reactComponentCase } from "~/utils";
import { fatal, info, load, success, warning } from "~/utils-node";

import generatePdfs from "./pdf";
import configs from "./vite/configs";

export type PrintOptions = {
  port: number;
  outDir: string;
  server: boolean;
};

export default async function print(options: PrintOptions) {
  const contests = await load("contests", contestSchema);
  const variantConfigs = await load("variants", variantsConfigSchema);

  info("Building website...");
  process.env.QUIZMS_MODE = "print";

  const pages = ["index", ...contests.map((contest) => contest.id)];

  const buildDir = path.join(cwd(), ".quizms", "pdf-build");
  const buildConfig = mergeConfig(configs("production"), {
    publicDir: path.join(cwd(), "public"),
    build: {
      outDir: buildDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        input: Object.fromEntries(
          pages.map((page) => [page, "virtual:quizms-entry?id=virtual:quizms-print-entry"]),
        ),
      },
      minify: false,
    },
    plugins: [printEntry(contests, variantConfigs)],
    logLevel: "info",
  } as InlineConfig);
  try {
    await build(buildConfig);
  } catch (e) {
    console.error(e);
    fatal("Build failed.");
  }

  const fastify = createPrintServer(buildDir);

  const port = await detect(options.port);
  if (options.server && port !== options.port) {
    warning(`Port ${options.port} is in use, trying another one...`);
  }

  await fastify.listen({ port });

  if (options.server) {
    const addresses = fastify
      .addresses()
      .map((info) => {
        const address =
          info.family === "IPv6"
            ? `[${info.address}]`
            : info.address.replace("127.0.0.1", "localhost");
        return `  ${styleText("green", "→")}  ${styleText("bold", `${info.family}:`.padEnd(8))} ${styleText("cyan", `http://${address}:${styleText("bold", String(info.port))}/`)}`;
      })
      .join("\n");
    success(`Server started:\n${addresses}`);
    await new Promise(noop);
  }

  const address = fastify.addresses()[0];
  await generatePdfs(
    contests,
    variantConfigs,
    `http://${address.address}:${address.port}`,
    options.outDir,
  );

  await fastify.close();
}

function printEntry(contests: Contest[], variantConfigs: VariantsConfig[]): PluginOption {
  const contestConfigs = contests.map((contest) => {
    const config = variantConfigs.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }
    return { ...contest, ...config };
  });

  return {
    name: "quizms:print-entry",
    resolveId(id) {
      if (id === "virtual:quizms-print-entry") {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-print-entry") {
        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { PrintProvider, PrintRoutes } from "@olinfo/quizms/print";
import { Route } from "wouter";

${contestConfigs
  .flatMap((contest) =>
    contest.header
      ? [`import ${reactComponentCase(contest.id)}Header from "/${contest.header}";`]
      : [],
  )
  .join("\n")}

export default function createPrintEntry() {
  return createApp(
    <PrintRoutes contests={${JSON.stringify(contestConfigs)}}>
      ${contestConfigs
        .map(
          (contest) => `
            <Route path="/${contest.id}">
              <PrintProvider contest={${JSON.stringify(contest)}}>
                ${contest.header && `<${reactComponentCase(contest.id)}Header />`}
              </PrintProvider>
            </Route>`,
        )
        .join("\n")}
    </PrintRoutes>
  );
}`;
        return transformWithEsbuild(entry, "virtual-quizms-print-entry.jsx", { jsx: "automatic" });
      }
    },
  };
}

function createPrintServer(buildDir: string) {
  const fastify = Fastify();

  fastify.register(fastifyStatic, {
    root: buildDir,
    extensions: ["html"],
  } as RegisterOptions & FastifyStaticOptions);

  fastify.register(fastifyStatic, {
    prefix: "/print-proxy/files/",
    root: path.join(cwd(), "variants"),
    decorateReply: false,
  } as RegisterOptions & FastifyStaticOptions);

  return fastify;
}
