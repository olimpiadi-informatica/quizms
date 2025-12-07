import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";

import type { OutputAsset, RollupOutput } from "rollup";
import { build, type InlineConfig, mergeConfig, transformWithEsbuild } from "vite";
import yaml from "yaml";

import type { Schema, Variant } from "~/models";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { AsyncPool, hash } from "~/utils";
import { fatal, info, load, success } from "~/utils-node";

import configs from "./vite/configs";
import { externalLibs } from "./vite/statement-externals";

export type ExportVariantsOptions = {
  outDir: string;
};

export default async function variants(options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  const configs = await load("variants", variantsConfigSchema);

  const baseStatement = await buildBaseStatements(configs);

  const buildDir = path.join(cwd(), ".quizms", "variants-build");
  const variantsDir = options?.outDir || path.join(cwd(), "variants");

  await rm(variantsDir, { recursive: true, force: true });

  const rawCode = await readFile(baseStatement.clientModule.file, "utf-8");
  const { code: clientModuleCode } = await transformWithEsbuild(
    rawCode,
    baseStatement.clientModule.file,
    { minify: true, legalComments: "none" },
  );

  const pool = new AsyncPool(cpus().length);
  for (const config of configs) {
    for (const variant of [...config.variantIds, ...config.pdfVariantIds]) {
      void pool.run(async () => {
        const variantDir = path.join(variantsDir, config.id, variant);
        await mkdir(variantDir, { recursive: true });

        await writeFile(path.join(variantDir, baseStatement.clientModule.id), clientModuleCode);
        if (baseStatement.cssModule) {
          await cp(baseStatement.cssModule, path.join(variantDir, "statement.css"));
        }

        const variantHash = hash(`${config.id}-${variant}-${config.secret}`);
        info(`Building variant ${variant} (${variantHash})...`);

        const rawSchema: Buffer[] = [];
        const child = spawn(process.execPath, ["--conditions=react-server", "server.js"], {
          cwd: buildDir,
          stdio: ["ignore", "pipe", "inherit"],
          env: {
            ...process.env,
            NODE_ENV: "production",
            QUIZMS_CONTEST_ID: config.id,
            QUIZMS_VARIANT_ID: variant,
            QUIZMS_VARIANT_HASH: variantHash.toString(),
            QUIZMS_SHUFFLE_PROBLEMS: config.shuffleProblems ? "true" : undefined,
            QUIZMS_SHUFFLE_ANSWERS: config.shuffleAnswers ? "true" : undefined,
          },
        });
        child.stdout.on("data", (data) => rawSchema.push(data));
        const code = await new Promise<number>((resolve, reject) => {
          child.on("close", resolve);
          child.on("error", reject);
        });
        if (code !== 0) {
          fatal(`Failed to build variant ${variant}.`);
        }

        const schema = yaml.parse(`{ "schema": ${Buffer.concat(rawSchema).toString("utf-8")} }`);
        await writeFile(
          path.join(variantDir, "answers.json"),
          JSON.stringify({
            id: variant,
            isOnline: config.variantIds.includes(variant),
            isPdf: config.pdfVariantIds.includes(variant),
            contestId: config.id,
            schema: parseSchema(schema.schema),
          } satisfies Variant),
        );
      });
    }
  }

  await pool.wait();
}

type Manifest = Record<
  string,
  {
    id: string;
    chunks: string[];
    name: string;
    async?: boolean;
  }
>;

type BaseStatement = {
  clientModule: {
    id: string;
    file: string;
  };
  cssModule?: string;
};

async function buildBaseStatements(generationConfigs: VariantsConfig[]): Promise<BaseStatement> {
  const entry = Object.fromEntries(generationConfigs.map((c) => [c.id, c.entry]));

  const outDir = path.join(cwd(), ".quizms", "variants-build");
  const bundleConfig = mergeConfig(configs("production"), {
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        fileName: "base-statement-[name]",
        formats: ["es"],
      },
      rollupOptions: {
        output: {
          assetFileNames: "[name][extname]",
          chunkFileNames: "[name].js",
          hoistTransitiveImports: false,
          manualChunks: (id, meta) => {
            const info = meta.getModuleInfo(id);
            const directives: string[] | undefined = info?.meta?.preserveDirectives?.directives;
            const isClient = directives?.includes("use client");
            if (isClient) {
              return "client-modules";
            }
          },
        },
        external: externalLibs,
      },
    },
    resolve: {
      conditions: ["react-server"],
    },
  } as InlineConfig);

  let outputs: RollupOutput[];
  try {
    outputs = (await build(bundleConfig)) as RollupOutput[];
  } catch (err) {
    fatal(`Build failed: ${err}`);
  }

  const chunks = outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === "chunk")
    .filter((chunk) => chunk.code.startsWith('"use client"'));

  if (chunks.length === 0) {
    fatal("No client chunks found");
  } else if (chunks.length !== 1) {
    fatal("Multiple client chunks found");
  }
  const clientChunk = chunks[0];

  const manifest: Manifest = {};
  const clientChunkFile = path.join(outDir, clientChunk.fileName);
  const clientModuleId = `${crypto.randomUUID()}.mjs`;
  manifest[pathToFileURL(clientChunkFile).href] = {
    id: clientModuleId,
    chunks: [],
    name: "*",
    async: true,
  };

  const cssChunks = outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === "asset")
    .filter((chunk) => chunk.fileName.endsWith(".css"));
  if (cssChunks.length > 1) {
    fatal("Multiple CSS chunks found");
  }
  const cssChunk: OutputAsset | undefined = cssChunks[0];

  await Promise.all([
    writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest)),
    writeFile(path.join(outDir, "loader.js"), loaderFile()),
    writeFile(path.join(outDir, "package.json"), '{"type":"module"}'),
    writeFile(path.join(outDir, "server.js"), serverFile()),
  ]);

  success("Build succeeded");

  return {
    clientModule: {
      id: clientModuleId,
      file: clientChunkFile,
    },
    cssModule: cssChunk && path.join(outDir, cssChunk.fileName),
  };
}

function serverFile() {
  return `\
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { register } from "node:module";

import { createElement } from "react";
import { renderToPipeableStream } from "react-server-dom-webpack/server";

register("./loader.js", import.meta.url);
register("react-server-dom-webpack/node-loader", import.meta.url);

const { default: Statement } = await import(\`./base-statement-\${process.env.QUIZMS_CONTEST_ID}.mjs\`);

const manifest = JSON.parse(await readFile("manifest.json", "utf-8"));
const { pipe } = renderToPipeableStream(createElement(Statement), manifest);

const statementPath = path.join(
  "${cwd()}",
  "variants",
  process.env.QUIZMS_CONTEST_ID,
  process.env.QUIZMS_VARIANT_ID,
  "statement.txt",
);
pipe(createWriteStream(statementPath));`;
}

function loaderFile() {
  return `\
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (Buffer.isBuffer(result.source)) {
    result.source = result.source.toString("utf-8");
  }
  return result;
}`;
}

function getFullSubProblemId(problemId: string, subProblemId: string | null): string {
  return subProblemId == null ? problemId : `${problemId}.${subProblemId}`;
}

function parseSchema(schema: RawSchema): Schema {
  return Object.fromEntries(
    schema.flatMap((problem) =>
      problem.subProblems.map(
        (subProblem) =>
          [
            getFullSubProblemId(problem.id, subProblem.id),
            {
              originalId:
                problem.originalId != null
                  ? getFullSubProblemId(problem.originalId, subProblem.id)
                  : undefined,
              type: subProblem.type,
              maxPoints: problem.pointsCorrect,
              options: [
                ...subProblem.options.map((option) => ({
                  value: option.value,
                  points: option.correct ? problem.pointsCorrect : problem.pointsWrong,
                  originalId: option.originalId,
                })),
                {
                  value: null,
                  points: problem.pointsBlank,
                },
              ],
              allowEmpty: true,
            },
          ] as const,
      ),
    ),
  );
}

type RawSchema = {
  id: string;
  pointsCorrect: number;
  pointsBlank: number;
  pointsWrong: number;
  originalId?: string;
  subProblems: {
    id: string;
    type: "text" | "number";
    options: {
      value: string;
      correct: boolean;
      originalId?: string;
    }[];
  }[];
}[];
