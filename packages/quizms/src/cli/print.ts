import { existsSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import { styleText } from "node:util";

import fastifyStatic, { type FastifyStaticOptions } from "@fastify/static";
import { detect } from "detect-port";
import Fastify, { type RegisterOptions } from "fastify";
import { noop, uniq } from "lodash-es";
import {
  build,
  type InlineConfig,
  mergeConfig,
  type PluginOption,
  transformWithEsbuild,
} from "vite";

import type { Contest } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { localizedFileName } from "~/utils";
import {
  fatal,
  findHeaderTranslations,
  info,
  isMultilingual,
  loadContests,
  statementFileName,
  success,
  warning,
} from "~/utils-node";

import generatePdfs, { type PrintContest } from "./pdf";
import configs from "./vite/configs";
import { headerEntry } from "./vite/header";

export type PrintOptions = {
  port: number;
  outDir: string;
  server: boolean;
  /** Languages from the command line, replacing the configured ones */
  languages?: string[];
};

export default async function print(options: PrintOptions) {
  const contests = resolveLanguages(await loadContests(), options);

  info("Building website...");

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
    plugins: [printEntry(contests)],
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
  await generatePdfs(contests, `http://${address.address}:${address.port}`, options.outDir);

  await fastify.close();
}

/**
 * Resolves the languages to print for each contest, and checks that their statements (built by
 * `quizms variants`) and header translations exist.
 */
function resolveLanguages(
  loaded: (Contest & VariantsConfig)[],
  options: PrintOptions,
): PrintContest[] {
  const missingStatements: string[] = [];
  const missingHeaders: string[] = [];

  const contests = loaded.map((config) => {
    const languages = options.languages ?? config.languages;
    const multilingual = isMultilingual(config, options.languages);
    const statementFiles = Object.fromEntries(
      languages.map((language) => [language, statementFileName(multilingual, language)]),
    );

    for (const variant of uniq([...config.variantIds, ...config.pdfVariantIds])) {
      for (const file of new Set(Object.values(statementFiles))) {
        const filePath = path.join("variants", config.id, variant, file);
        if (!existsSync(path.join(cwd(), filePath))) missingStatements.push(filePath);
      }
    }

    let headerTranslations: Record<string, string> = {};
    if (config.header) {
      const { translations, missing } = findHeaderTranslations(
        config.header,
        languages,
        config.languages[0],
      );
      headerTranslations = translations;
      for (const language of missing) {
        missingHeaders.push(path.join("src", localizedFileName(config.header, language)));
      }
    }

    return { ...config, languages, multilingual, statementFiles, headerTranslations };
  });

  const errors: string[] = [];
  if (missingStatements.length > 0) {
    const flag = options.languages ? ` --languages=${options.languages.join(",")}` : "";
    errors.push(
      `Missing statements, run \`quizms variants${flag}\` first:\n${missingStatements.map((f) => `  - ${f}`).join("\n")}`,
    );
  }
  if (missingHeaders.length > 0) {
    errors.push(
      `Missing header translations:\n${missingHeaders.map((f) => `  - ${f}`).join("\n")}`,
    );
  }
  if (errors.length > 0) {
    // In server mode, let the user look at what is there.
    if (options.server) {
      warning(errors.join("\n"));
    } else {
      fatal(errors.join("\n"));
    }
  }

  return contests;
}

function printEntry(contestConfigs: PrintContest[]): PluginOption {
  return {
    name: "quizms:print-entry",
    resolveId(id) {
      if (id === "virtual:quizms-print-entry") {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-print-entry") {
        const headers = new Map(
          contestConfigs
            .filter((contest) => contest.header)
            .map((contest) => [
              contest.id,
              headerEntry(contest.id, contest.header!, contest.headerTranslations),
            ]),
        );

        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { Localized } from "@olinfo/quizms/components";
import { PrintProvider, PrintRoutes } from "@olinfo/quizms/print";
import { Route } from "wouter";

${[...headers.values()].flatMap((header) => header.imports).join("\n")}

export default function createPrintEntry() {
  return createApp(
    <PrintRoutes contests={${JSON.stringify(contestConfigs)}}>
      ${contestConfigs
        .map(
          (contest) => `
            <Route path="/${contest.id}">
              <PrintProvider
                contest={${JSON.stringify(contest)}}
                statementFiles={${JSON.stringify(contest.statementFiles)}}>
                ${headers.get(contest.id)?.element ?? ""}
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
