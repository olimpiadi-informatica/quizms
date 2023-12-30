import { dirname, extname, join } from "node:path";

import glob from "fast-glob";
import license from "rollup-plugin-license";
import { InlineConfig, build, mergeConfig } from "vite";

import { fatal } from "./utils/logs";
import configs from "./vite/configs";

export type ExportOptions = {
  dir: string;
  outDir: string;
  training?: boolean;
};

export default async function staticExport(options: ExportOptions): Promise<void> {
  if (options.training) {
    process.env.QUIZMS_MODE = "training";
  } else {
    process.env.QUIZMS_MODE = "contest";
  }

  const root = join(options.dir, "src");
  const pages = await glob("**/index.{html,jsx}", {
    cwd: root,
  });
  const input = Object.fromEntries(
    pages.map((p) => {
      const dir = dirname(p);
      const name = dir === "." ? "index" : dir.replace(/\W/g, "-");
      const entry =
        extname(p) === ".jsx" ? `virtual:react-entry?src=${encodeURIComponent(p)}` : join(root, p);
      return ["page-" + name, entry];
    }),
  );

  const outDir = join(options.dir, options.outDir);

  const config = mergeConfig(configs(join(options.dir, "src"), "production"), {
    publicDir: join(options.dir, "public"),
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 1024,
      rollupOptions: {
        input,
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/katex/")) return "katex";
            if (id.includes("node_modules/lodash-es/")) return "lodash";
            if (id.includes("node_modules/@firebase/auth/")) return "firebase-auth";
            if (id.includes("node_modules/@firebase/firestore/")) return "firestore";
            if (id.includes("node_modules/@firebase/")) return "firebase";
            if (id.includes("node_modules/zod/")) return "zod";

            // FIXME: the order in which chunks are loaded is apparently important, as a workaround
            //  we need to rename react-dom to something else so that it is loaded in the correct order
            if (id.includes("node_modules/react-dom/")) return "~react-dom";
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
            file: join(outDir, "LICENSES.txt"),
          },
        },
      }),
    ],
    logLevel: "info",
  } as InlineConfig);

  try {
    await build(config);
  } catch (e) {
    fatal("Build failed.");
  }
}
