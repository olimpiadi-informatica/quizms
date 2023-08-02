import fs from "node:fs/promises";
import path from "node:path";
import { exit } from "node:process";
import { promisify } from "node:util";

import { Config as SwcOptions } from "@swc/core";
import "colors";
import _ from "lodash";
import prettyBytes from "pretty-bytes";
import TerserPlugin from "terser-webpack-plugin";
import webpack, { Configuration as WebpackConfig } from "webpack";

import { mdxOptions } from "@/mdx";

async function exists(path: string): Promise<boolean> {
  return fs.access(path).then(_.stubTrue, _.stubFalse);
}

export default async function bundle(contestFile: string): Promise<void> {
  console.log(`- ${"wait".cyan} compiling ${contestFile}`);

  const swcOptions: SwcOptions = {
    jsc: {
      experimental: {
        plugins: [],
      },
    },
  };

  const variant = process.env.QUIZMS_VARIANT?.padStart(5, "0") ?? "default";

  const webpackConfig: WebpackConfig = {
    entry: contestFile,
    output: {
      filename: `contest-${variant}.js`,
      library: {
        name: "quizmsContest",
        type: "var",
        export: "default",
      },
    },
    mode: "production",
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: {
              comments: false,
            },
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.mdx?$/,
          use: [
            { loader: "swc-loader", options: swcOptions },
            { loader: "@mdx-js/loader", options: mdxOptions },
          ],
        },
      ],
    },
    externals: ["quizms", "react"],
    resolve: {
      modules: ["node_modules"],
    },
  };

  const jsconfigPath = path.resolve("jsconfig.json");
  if (await exists(jsconfigPath)) {
    const jsconfig = JSON.parse(await fs.readFile(jsconfigPath, "utf-8"));
    if (jsconfig?.compilerOptions?.baseUrl) {
      webpackConfig.resolve!.modules!.push(path.resolve(jsconfig.compilerOptions.baseUrl));
    }
  }

  const nextConfigPath = path.resolve("next.config.js");
  if (await exists(nextConfigPath)) {
    const { nextConfig } = await import(nextConfigPath);

    nextConfig?.webpack?.(webpackConfig, {
      dev: false,
      isServer: true,
    });

    if (nextConfig?.modularizeImports) {
      swcOptions.jsc!.experimental!.plugins!.push([
        "@swc/plugin-transform-imports",
        nextConfig.modularizeImports,
      ]);
    }
  }

  const compiler = webpack(webpackConfig);
  const stats = await promisify(compiler.run.bind(compiler))();
  await promisify(compiler.close.bind(compiler))();

  if (stats?.hasErrors()) {
    const json = stats.toJson();
    for (const error of json.errors!) {
      console.log(`- ${"error".red} ${error.message}`);
    }
    exit(1);
  }

  if (stats?.hasWarnings()) {
    const json = stats.toJson();
    for (const warning of json.warnings!) {
      console.log(`- ${"warn".yellow} ${warning.message}`);
    }
  }

  const fullStats = stats?.toJson();

  const time = fullStats?.time ? ` in ${fullStats.time / 1000}s` : "";
  console.log(`- ${"event".magenta} compilation completed successfully${time}.`);
  for (const asset of stats?.toJson().assets ?? []) {
    console.log(`- ${"emitting".green} ${asset.name} ${prettyBytes(asset.size)}`);
  }
}
