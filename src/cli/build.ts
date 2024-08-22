import path from "node:path";

import glob from "fast-glob";
import license from "rollup-plugin-license";
import { type InlineConfig, build, mergeConfig } from "vite";

import { error, fatal } from "~/utils/logs";

import configs from "./vite/configs";

export type ExportOptions = {
  dir: string;
  outDir: string;
  training?: boolean;
  library?: boolean;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  process.env.QUIZMS_MODE = options.training ? "training" : "contest";

  const root = path.join(options.dir, "src");
  const config = mergeConfig(
    configs(root, "production"),
    await (options.library ? libraryConfigs : standaloneConfigs)(root, options),
  );

  try {
    await build(config);
  } catch (err) {
    error((err as Error).message);
    fatal("Build failed.");
  }
}

async function standaloneConfigs(_root: string, options: ExportOptions): Promise<InlineConfig> {
  const outDir = path.join(options.dir, options.outDir);

  return {
    publicDir: path.join(options.dir, "public"),
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2022",
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
            file: path.join(outDir, "LICENSES.txt"),
          },
        },
      }),
    ],
    logLevel: "info",
  } as InlineConfig;
}

async function libraryConfigs(root: string, options: ExportOptions): Promise<InlineConfig> {
  const outDir = path.join(options.dir, options.outDir);

  const pages = await glob("**/page.{js,jsx,ts,tsx}", { cwd: root });
  const entry = Object.fromEntries(pages.map((page) => [page.replace(/\.\w+$/, ""), page]));

  return {
    build: {
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        formats: ["es"],
      },
      rollupOptions: {
        external: /^[^./~]|\/node_modules\//,
        output: {
          preserveModules: true,
          preserveModulesRoot: root,
        },
      },
    },
  };
}
