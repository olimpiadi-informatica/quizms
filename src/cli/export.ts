import { dirname, extname, join } from "node:path";

import glob from "fast-glob";
import { build } from "vite";

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
      const name = "page-" + dirname(p).replace(/\W/g, "-");
      const entry =
        extname(p) === ".jsx" ? `virtual:react-entry?src=${encodeURIComponent(p)}` : join(root, p);
      return [name, entry];
    }),
  );

  await build({
    ...configs(join(options.dir, "src"), "production"),
    publicDir: join(options.dir, "public"),
    build: {
      outDir: join(options.dir, options.outDir),
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
    logLevel: "info",
  });
}
