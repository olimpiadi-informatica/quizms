import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { parseContest } from "~/jsx-runtime/parser";

import configs from "./vite/configs";

export type PdfOptions = {
  dir: string;
  outDir: string;
  variant?: string;
  contest?: string;
};

export default async function pdf(options: PdfOptions) {
  process.env.QUIZMS_MODE = "pdf";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const outDir = join(options.dir, options.outDir);
  const serverDir = temporaryDirectory();
  const fileName = "base-contest";

  const bundleConfig: InlineConfig = {
    root: join(options.dir, "src"),
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: options.contest ?? "contest/contest.mdx",
        fileName,
        formats: ["es"],
      },
    },
  };

  const serverConfig: InlineConfig = {
    root: join(options.dir, "src"),
    build: {
      copyPublicDir: false,
      outDir: serverDir,
      emptyOutDir: true,
      lib: {
        entry: "print.html",
        fileName,
        formats: ["es"],
      },
    },
  };

  await build(mergeConfig(defaultConfig, bundleConfig));
  const contestPath = join(outDir, `${fileName}.mjs`);
  const contestURL = pathToFileURL(contestPath);
  const { default: contestJsx } = await import(/* vite-ignore */ contestURL.toString());

  await build(mergeConfig(defaultConfig, serverConfig));

  const app = express();
  app.listen(3001, () => {
    console.log("Server listening on port 3001");
  });

  app.get("/variant.js", (req, res) => {
    res.setHeader("content-type", "text/javascript");
    const secret = "casarin";
    res.send(parseContest(contestJsx, `${secret}-${req.query.variant}`));
  });

  app.use(express.static(serverDir));
}
