import path from "node:path";
import { cwd } from "node:process";

import license from "rollup-plugin-license";
import { build, type InlineConfig, mergeConfig } from "vite";

import { error, fatal } from "~/utils/logs";

import configs from "./vite/configs";

export type ExportOptions = {
  outDir: string;
  training?: boolean;
  library?: boolean;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  if (options.training) {
    process.env.QUIZMS_MODE = "training";
  }

  const config = mergeConfig(configs("production"), {
    publicDir: path.join(cwd(), "public"),
    build: {
      outDir: path.join(cwd(), options.outDir),
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input: "virtual:quizms-entry",
        output: {
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
      sourcemap: options.training,
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

  try {
    await build(config);
  } catch (err) {
    error((err as Error).message);
    fatal("Build failed.");
  }
}
