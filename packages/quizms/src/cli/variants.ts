import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import { cwd } from "node:process";

import { sortBy } from "lodash-es";
// @ts-ignore
import WebpackRscPlugin from "react-server-dom-webpack/plugin";
import type { RollupOutput } from "rollup";
import { build, type InlineConfig, mergeConfig } from "vite";
import webpack from "webpack";
import webpackNodeExternals from "webpack-node-externals";
import yaml from "yaml";

import type { Schema } from "~/models";
import load from "~/models/load";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { AsyncPool } from "~/utils/async-pool";
import { hash } from "~/utils/hash";
import { fatal, info, success } from "~/utils/logs";

import configs from "./vite/configs";
import externals from "./vite/externals";

export type ExportVariantsOptions = {
  config: string;
  outDir: string;
};

export default async function variants(_options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  const variantsConfig = await load("variants", variantsConfigSchema);
  await buildVariants(variantsConfig);
}

export async function buildVariants(configs: VariantsConfig[]): Promise<void> {
  await buildBaseStatements(configs);

  const pool = new AsyncPool(cpus().length);

  const buildDir = path.join(cwd(), ".quizms", "variants-build");
  const variantDir = path.join(cwd(), "variants");

  await rm(variantDir, { recursive: true, force: true });
  await cp(path.join(buildDir, "version.txt"), path.join(variantDir, "version.txt"));

  for (const config of configs) {
    await mkdir(path.join(variantDir, config.id), { recursive: true });
    for (const variant of [...config.variantIds, ...config.pdfVariantIds]) {
      void pool.run(async () => {
        const variantHash = hash(`${config.id}-${variant}-${config.secret}`);
        info(`Building variant ${variant} (${variantHash})...`);

        const rawSchema: Buffer[] = [];
        const child = spawn(
          process.execPath,
          ["--conditions=react-server", `server-${config.id}.js`],
          {
            cwd: buildDir,
            stdio: ["ignore", "pipe", "inherit"],
            env: {
              ...process.env,
              NODE_ENV: "production",
              QUIZMS_CONTEST_ID: config.id,
              QUIZMS_VARIANT_ID: variant,
              QUIZMS_VARIANT_HASH: variantHash.toString(),
            },
          },
        );
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
          path.join(variantDir, config.id, `${variant}.json`),
          JSON.stringify({ id: variant, contestId: config.id, schema: parseSchema(schema.schema) }),
        );
      });
    }
  }

  await pool.wait();
}

async function buildBaseStatements(generationConfigs: VariantsConfig[]): Promise<void> {
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
          preserveModules: true,
          hoistTransitiveImports: false,
        },
      },
    },
    resolve: {
      conditions: ["react-server"],
    },
    plugins: [externals({ exclude: [/^@olinfo\/quizms-/] })],
  } as InlineConfig);

  let outputs: RollupOutput[];
  try {
    // TODO: deterministic builds
    outputs = (await build(bundleConfig)) as RollupOutput[];
  } catch (err) {
    fatal(`Build failed: ${err}`);
  }

  const hash = createHash("sha256");
  const chunks = outputs.flatMap((output) => output.output);
  for (const chunk of sortBy(chunks, "fileName")) {
    hash.update(chunk.fileName);
    hash.update(Buffer.from([0]));
    if ("code" in chunk) {
      hash.update(chunk.code);
    }
    hash.update(Buffer.from([0]));
  }
  const digest = hash.digest("hex");
  success(`Build succeeded (${digest})`);

  await Promise.all([
    writeFile(path.join(outDir, "version.txt"), digest),
    writeFile(path.join(outDir, "entry.js"), entryFile(digest)),
    writeFile(path.join(outDir, "package.json"), '{"type":"module"}'),
  ]);

  const stats = await new Promise<webpack.Stats | undefined>((resolve, reject) =>
    webpack(webpackConfig(outDir), (err, stats) => (err ? reject(err) : resolve(stats))),
  );
  if (stats) {
    info(stats.toString({ colors: true, chunks: false }));
  }

  await writeFile(path.join(outDir, "loader.js"), loaderFile());
  for (const config of generationConfigs) {
    await writeFile(path.join(outDir, `server-${config.id}.js`), serverFile(config.id));
    await cp(
      path.join(outDir, "dist", "main.mjs"),
      path.join(cwd(), "src", config.entry.replace(/\..*$/, ".mjs")),
    );
  }
}

function webpackConfig(outDir: string): webpack.Configuration {
  return {
    mode: "production",
    devtool: false,
    performance: {
      hints: false,
    },
    entry: path.join(outDir, "entry.js"),
    output: {
      path: path.join(outDir, "dist"),
      clean: true,
      asyncChunks: false,
      library: {
        type: "module",
      },
    },
    externalsPresets: { node: true },
    externals: [
      webpackNodeExternals({ importType: "module", allowlist: /^react-server-dom-webpack/ }),
    ],
    experiments: {
      outputModule: true,
    },
    plugins: [
      new WebpackRscPlugin({
        isServer: false,
        clientReferences: {
          directory: outDir,
          recursive: true,
          include: /\.m?js$/,
        },
      }),
    ],
  };
}

function entryFile(version: string) {
  return `\
export { createFromFetch } from "react-server-dom-webpack/client";
export const statementVersion = "${version}";
`;
}

function serverFile(contestId: string) {
  return `\
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { register } from "node:module";

import { createElement } from "react";
import { renderToPipeableStream } from "react-server-dom-webpack/server";

register("./loader.js", import.meta.url);
register("react-server-dom-webpack/node-loader", import.meta.url);

const { default: Statement } = await import("./base-statement-${contestId}.mjs");

const manifest = JSON.parse(await readFile("./dist/react-client-manifest.json", "utf-8"));
const { pipe } = renderToPipeableStream(createElement(Statement), manifest);

const statementPath = path.join(
  "${cwd()}",
  "variants",
  process.env.QUIZMS_CONTEST_ID,
  \`$\{process.env.QUIZMS_VARIANT_ID}.txt\`
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

function parseSchema(schema: RawSchema): Schema {
  return Object.fromEntries(
    schema.flatMap((problem) =>
      problem.subProblems.map(
        (subProblem) =>
          [
            subProblem.id == null ? problem.id : `${problem.id}.${subProblem.id}`,
            {
              type: subProblem.type,
              maxPoints: problem.pointsCorrect,
              options: [
                ...subProblem.options.map((option) => ({
                  value: option.value,
                  points: option.correct ? problem.pointsCorrect : problem.pointsWrong,
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
  subProblems: {
    id: string;
    type: "text" | "number";
    options: {
      value: string;
      correct: boolean;
    }[];
  }[];
}[];
