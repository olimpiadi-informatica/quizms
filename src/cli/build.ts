import path from "node:path";

import glob from "fast-glob";
import license from "rollup-plugin-license";
import { InlineConfig, build, mergeConfig } from "vite";

import { error, fatal } from "~/utils/logs";

import configs from "./vite/configs";

export type ExportOptions = {
  dir: string;
  outDir: string;
  training?: boolean;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  process.env.QUIZMS_MODE = options.training ? "training" : "contest";

  const root = path.join(options.dir, "src");
  const pages = await glob("**/index.{html,jsx}", {
    cwd: root,
  });
  const input = Object.fromEntries(
    pages.map((p) => {
      const dir = path.dirname(p);
      const name = dir === "." ? "index" : dir.replaceAll(/\W/g, "-");
      const entry =
        path.extname(p) === ".jsx"
          ? `virtual:react-entry?src=${encodeURIComponent(p)}`
          : path.join(root, p);
      return ["page-" + name, entry];
    }),
  );

  const outDir = path.join(options.dir, options.outDir);

  const config = mergeConfig(configs(path.join(options.dir, "src"), "production"), {
    publicDir: path.join(options.dir, "public"),
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input,
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
  } as InlineConfig);

  try {
    await build(config);
  } catch (err) {
    error((err as Error).message);
    fatal("Build failed.");
  }
}
