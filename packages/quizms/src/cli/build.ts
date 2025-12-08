import path from "node:path";
import { cwd } from "node:process";

import license from "rollup-plugin-license";
import { createBuilder, type InlineConfig, mergeConfig } from "vite";

import { error, fatal } from "~/utils-node";

import configs from "./vite/configs";

export type ExportOptions = {
  outDir: string;
  preset: string;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  process.env.QUIZMS_MODE = "contest";

  const config: InlineConfig = mergeConfig(configs("production"), {
    publicDir: path.join(cwd(), "public"),
    build: {
      outDir: path.join(cwd(), options.outDir),
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      minify: true,
      emitAssets: true,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[hash]-[name].js",
          hoistTransitiveImports: false,
          manualChunks: (id) => {
            if (id.includes("commonjsHelpers")) return "commonjs-helper";
            if (id.includes("node_modules/katex/")) return "katex";
            if (id.includes("node_modules/@firebase/auth/")) return "firebase-auth";
            if (id.includes("node_modules/@firebase/firestore/")) return "firestore";
            if (id.includes("node_modules/@firebase/")) return "firebase";
            if (id.includes("node_modules/zod/")) return "zod";
            if (id.includes("node_modules/react-dom/")) return "react-dom";
          },
        },
        treeshake: {
          moduleSideEffects: (id) => {
            return !id.includes("node_modules/acorn/");
          },
        },
      },
    },
    esbuild: {
      legalComments: "external",
      banner: "/*! For licenses information, see LICENSES.txt */",
    },
    plugins: [
      license({
        thirdParty: {
          output: {
            file: path.join(cwd(), options.outDir, "LICENSES.txt"),
          },
        },
      }),
    ],
    logLevel: "info",
  } as InlineConfig);

  const builder = await createBuilder(config);
  const environment = builder.environments[options.preset];
  if (!environment) {
    const availablePresets = Object.keys(builder.environments)
      .filter((preset) => preset !== "client")
      .join(", ");
    fatal(`Invalid preset "${options.preset}". Available presets: ${availablePresets}`);
  }

  try {
    await builder.build(environment);
  } catch (err) {
    error((err as Error).message);
    fatal("Build failed.");
  }
}
