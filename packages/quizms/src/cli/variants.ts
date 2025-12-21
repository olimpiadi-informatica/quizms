import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";

import { uniq } from "lodash-es";
import type { OutputAsset, RollupOutput } from "rollup";
import nodeExternals from "rollup-plugin-node-externals";
import { build, createBuilder, type InlineConfig, mergeConfig } from "vite";
import yaml from "yaml";

import type { Schema, Variant } from "~/models";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { hash } from "~/utils";
import { fatal, load, success, withProgress } from "~/utils-node";

import configs from "./vite/configs";
import directives from "./vite/directives";
import { externalLibs } from "./vite/statement-externals";

export type ExportVariantsOptions = {
  outDir: string;
};

export default async function variants(options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  const configs = await load("variants", variantsConfigSchema);

  const baseStatement = await buildBaseStatements(configs);

  const cacheDir = path.join(cwd(), ".quizms", "cache");
  const buildDir = path.join(cwd(), ".quizms", "variants-build");
  const variantsDir = options?.outDir || path.join(cwd(), "variants");

  await mkdir(cacheDir, { recursive: true });
  await rm(variantsDir, { recursive: true, force: true });

  const clientModuleBuild = await build({
    configFile: false,
    root: buildDir,
    mode: "production",
    build: {
      minify: true,
      rollupOptions: {
        input: baseStatement.clientModule.file,
        output: {
          entryFileNames: "[name].js",
        },
        preserveEntrySignatures: "strict",
        treeshake: {
          moduleSideEffects: false,
        },
      },
    },
    esbuild: {
      legalComments: "none",
    },
    plugins: [directives(), nodeExternals()],
  });

  const variants = configs.flatMap((config) =>
    uniq([...config.variantIds, ...config.pdfVariantIds]).map(
      (variant) => [config, variant] as const,
    ),
  );
  await withProgress(variants, variants.length, async ([config, variant]) => {
    const variantDir = path.join(variantsDir, config.id, variant);
    await mkdir(variantDir, { recursive: true });

    await cp(
      path.join(buildDir, "dist", (clientModuleBuild as RollupOutput).output[0].fileName),
      path.join(variantDir, baseStatement.clientModule.id),
    );
    if (baseStatement.cssModule) {
      await cp(baseStatement.cssModule, path.join(variantDir, "statement.css"));
    }

    const variantHash = hash(`${config.id}-${variant}-${config.secret}`);

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
        QUIZMS_CACHE_DIR: cacheDir,
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

  const root = cwd();
  const outDir = path.join(root, ".quizms", "variants-build");
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
          assetFileNames: "chunks/[name][extname]",
          chunkFileNames: "chunks/[name].js",
          hoistTransitiveImports: false,
          manualChunks: (id, meta) => {
            const info = meta.getModuleInfo(id);
            const directives: string[] | undefined = info?.meta?.preserveDirectives?.directives;
            const isClient = directives?.includes("use client");
            if (isClient) {
              return "client-modules";
            }
            if (info?.isIncluded) {
              return path
                .relative(root, id.replace("\0", ""))
                .replace(/^(\.*\/)*/, "")
                .replace(/\.\w+$/, "");
            }
          },
          onlyExplicitManualChunks: true,
        },
        external: [...externalLibs, "sharp", "svgo"],
      },
    },
    environments: {
      rsc: {
        resolve: {
          conditions: ["react-server"],
          noExternal: true,
        },
      },
    },
  } as InlineConfig);

  const builder = await createBuilder(bundleConfig);
  const environment = builder.environments.rsc;

  let outputs: RollupOutput[];
  try {
    outputs = (await builder.build(environment)) as RollupOutput[];
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

const { default: Statement } = await import(\`./\${process.env.QUIZMS_CONTEST_ID}.mjs\`);

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
            parseSubProblem(problem, subProblem),
          ] as const,
      ),
    ),
  );
}

function parseSubProblem(problem: RawProblem, subProblem: RawSubProblem): Schema[string] {
  const common = {
    originalId: getFullSubProblemId(problem.originalId, subProblem.id),
    type: subProblem.type,
    maxPoints: problem.pointsCorrect,
    allowEmpty: true,
  };

  if (subProblem.kind === "open") {
    return {
      ...common,
      kind: subProblem.kind,
      options: subProblem.options.map((option) => ({
        value: option.value,
        points: option.correct ? problem.pointsCorrect : problem.pointsWrong,
      })),
    };
  }

  return {
    ...common,
    kind: subProblem.kind,
    options: subProblem.options.map((option) => ({
      value: option.value,
      points: option.correct ? problem.pointsCorrect : problem.pointsWrong,
      originalId: option.originalId,
    })),
  };
}

type RawAnswerOption = {
  value: string;
  correct: boolean;
};

type RawSubProblem = {
  id: string;
  type: "text" | "number";
} & (
  | {
      kind: "open";
      options: RawAnswerOption[];
    }
  | {
      kind: "anyCorrect" | "allCorrect";
      options: (RawAnswerOption & {
        originalId: string;
      })[];
    }
);

type RawProblem = {
  id: string;
  pointsCorrect: number;
  pointsBlank: number;
  pointsWrong: number;
  originalId: string;
  subProblems: RawSubProblem[];
};

type RawSchema = RawProblem[];
