import { spawn } from "node:child_process";
import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";

// @ts-ignore
import WebpackRscPlugin from "react-server-dom-webpack/plugin";
import { type InlineConfig, build, mergeConfig } from "vite";
import webpack from "webpack";

import load from "~/models/load";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { fatal, info } from "~/utils/logs";

import { cpus } from "node:os";
import { AsyncPool } from "~/utils/async-pool";
import { hash } from "~/utils/hash";
import configs from "./vite/configs";

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
        external: [/^node:/, /^react/, /^@olinfo\/quizms/],
        output: {
          preserveModules: true,
        },
      },
    },
    resolve: {
      conditions: ["react-server"],
    },
  } as InlineConfig);

  try {
    await build(bundleConfig);
  } catch (err) {
    fatal(`Build failed: ${err}`);
  }

  await Promise.all([
    writeFile(path.join(outDir, "entry.js"), entryFile()),
    writeFile(path.join(outDir, "package.json"), '{"type":"module"}'),
  ]);

  const stats = await new Promise<webpack.Stats | undefined>((resolve, reject) =>
    webpack(webpackConfig(outDir), (err, stats) => (err ? reject(err) : resolve(stats))),
  );
  if (stats) {
    info(stats.toString({ colors: true, chunks: false }));
  }

  await Promise.all([
    writeFile(path.join(outDir, "loader.js"), loaderFile()),
    writeFile(path.join(outDir, "server.js"), serverFile(generationConfigs[0].id)),
    ...generationConfigs.map((config) =>
      cp(
        path.join(outDir, "dist", "main.mjs"),
        path.join(cwd(), "src", config.entry.replace(/\..*$/, ".mjs")),
      ),
    ),
  ]);
}

export async function buildVariants(configs: VariantsConfig[]): Promise<void> {
  await buildBaseStatements(configs);

  const pool = new AsyncPool(cpus().length);

  const buildDir = path.join(cwd(), ".quizms", "variants-build");
  for (const config of configs) {
    await mkdir(path.join(cwd(), "variants", config.id), { recursive: true });
    for (const variant of config.variantIds) {
      void pool.run(async () => {
        const variantHash = hash(`${config.id}-${variant}-${config.secret}`);
        info(`Building variant ${variant} (${variantHash})...`);
        const child = spawn(process.execPath, ["--conditions=react-server", "server.js"], {
          cwd: buildDir,
          stdio: "inherit",
          env: {
            ...process.env,
            NODE_ENV: "production",
            QUIZMS_CONTEST_ID: config.id,
            QUIZMS_VARIANT_ID: variant,
            QUIZMS_VARIANT_HASH: variantHash.toString(),
          },
        });
        const code = await new Promise<number>((resolve, reject) => {
          child.on("close", resolve);
          child.on("error", reject);
        });
        if (code !== 0) {
          fatal(`Failed to build variant ${variant}.`);
        }
      });
    }
  }

  await pool.wait();
}

export type ExportVariantsOptions = {
  config: string;
  outDir: string;
};

export default async function variants(_options: ExportVariantsOptions) {
  process.env.QUIZMS_MODE = "contest";

  const variantsConfig = await load("variants", variantsConfigSchema);
  await buildVariants(variantsConfig);
}

function webpackConfig(outDir: string): webpack.Configuration {
  return {
    mode: "production",
    devtool: false,
    performance: {
      hints: false,
    },
    entry: `${outDir}/entry.js`,
    output: {
      path: `${outDir}/dist`,
      clean: true,
      asyncChunks: false,
      library: {
        type: "module",
      },
    },
    externals: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@olinfo/quizms/internal/mdx-components",
    ],
    externalsType: "module",
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

function entryFile() {
  return `export { createFromFetch } from "react-server-dom-webpack/client";`;
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
