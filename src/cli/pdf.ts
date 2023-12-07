import { join } from "node:path";
import { build, InlineConfig, mergeConfig, createServer } from "vite";
import { parseContest } from "~/jsx-runtime/parser";
import { pathToFileURL } from "node:url";
import express from "express";

import configs from "./vite/configs";

export type PdfOptions = {
  dir: string;
  outDir: string;
  variant?: string;
  contest?: string;
};

export default async function pdf(options: PdfOptions) {
  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }
  process.env.QUIZMS_MODE = "contest";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const outDir = join(options.dir, options.outDir);
  console.log(outDir);
  const fileName = "base-contest";

  const bundleConfig: InlineConfig = {
    root: join(options.dir, "src"),
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: options.contest??"contest/contest.mdx",
        fileName,
        formats: ["es"],
      },
    },
  };

  const server = await createServer({
    ...configs("development"),
    root: join(options.dir, "src"),
    publicDir: join(options.dir, "public"),
  });
  await server.listen(3000);
  server.printUrls();

  await build(mergeConfig(defaultConfig, bundleConfig));
  const contestPath = join(outDir, `${fileName}.mjs`);
	const contestURL = pathToFileURL(contestPath);
  const { default: contestJsx } = await import (/* vite-ignore */ contestURL.toString())

  const app = express();
  app.listen(3001, () => {
    console.log(`Server listening on port 3001`)
  });

  process.env.QUIZMS_MODE = "development";

  app.get("/variant.js", (req, res) => {
    res.setHeader('content-type', 'text/javascript');
		const secret = "casarin"
    res.send(parseContest(contestJsx, `${secret}-${req.query.variant}`))
  });
}
