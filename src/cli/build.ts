import path from "node:path";

import glob from "fast-glob";
import { name as quizmsPackageName } from "package.json";
import license from "rollup-plugin-license";
import { type InlineConfig, build, mergeConfig } from "vite";

import { error, fatal } from "~/utils/logs";

import { cwd } from "node:process";
import configs from "./vite/configs";

export type ExportOptions = {
  outDir: string;
  training?: boolean;
  library?: boolean;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  process.env.QUIZMS_MODE = options.training ? "training" : "contest";

  const config = mergeConfig(
    configs("production"),
    await (options.library ? libraryConfigs : standaloneConfigs)(options),
  );

  try {
    await build(config);
  } catch (err) {
    error((err as Error).message);
    fatal("Build failed.");
  }
}

async function standaloneConfigs(options: ExportOptions): Promise<InlineConfig> {
  return {
    publicDir: "public",
    build: {
      outDir: options.outDir,
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input: "virtual:quizms-routes",
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
  } as InlineConfig;
}

async function libraryConfigs(options: ExportOptions): Promise<InlineConfig> {
  const pages = await glob("src/**/page.{js,jsx,ts,tsx}");
  const entry = Object.fromEntries(pages.map((page) => [page.replace(/\.\w+$/, ""), page]));

  return {
    build: {
      outDir: options.outDir,
      emptyOutDir: true,
      lib: {
        entry,
        formats: ["es"],
      },
      rollupOptions: {
        external: (id) => {
          if (id.includes("node_modules")) return true;
          if (id.startsWith("virtual:")) return false;
          if (id.startsWith(`${quizmsPackageName}/`)) return false;
          return !/^[./~]/.test(id);
        },
        output: {
          preserveModules: true,
          preserveModulesRoot: "src",
        },
      },
    },
  };
}
