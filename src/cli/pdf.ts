import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import { BrowserContext, chromium } from "playwright";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { parseContest } from "~/jsx-runtime/parser";
import { ContestConfig } from "~/models/generation-config";

import loadGenerationConfig from "./load-generation-config";
import configs from "./vite/configs";

async function pdfServer(dir: string, config: ContestConfig, port: number) {
  process.env.QUIZMS_MODE = "pdf";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const outDir = temporaryDirectory();
  const serverDir = temporaryDirectory();
  const fileName = "base-contest";

  const bundleConfig: InlineConfig = {
    root: join(dir, "src"),
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: config.entry,
        fileName,
        formats: ["es"],
      },
    },
  };

  const serverConfig: InlineConfig = {
    root: join(dir, "src"),
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
  const server = app.listen(port, () => {
    console.info(`Server listening on port ${port}`);
  });

  app.get("/variant.js", (req, res) => {
    res.setHeader("content-type", "text/javascript");
    res.send(parseContest(contestJsx, `${req.query.variant}`, config));
  });

  app.use(express.static(serverDir));
  return server;
}

async function printVariant(
  context: BrowserContext,
  secret: string,
  variantId: string,
  outDir: string,
  serverPort: number,
) {
  const page = await context.newPage();
  const seed = `${secret}${variantId}`;
  const url = `localhost:${serverPort}/print.html?variant=${seed}`;
  const path = `${outDir}/${variantId}.pdf`;
  console.info(`Printing variant with seed ${seed}`);
  await page.goto(url, { waitUntil: "load" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }
  await page.waitForTimeout(10 * 1000);
  await page.pdf({
    path,
    format: "a4",
  });
  console.info(`Printed variant with seed ${seed} to file ${path}`);
  await page.close();
}

export async function printVariants(config: ContestConfig, outDir: string, serverPort: number) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const chunkSize = 10;
  for (let i = 0; i < config.variantIds.length; i += chunkSize) {
    const tasks = [];
    for (const variantId of config.variantIds.slice(i, i + chunkSize)) {
      tasks.push(printVariant(context, config.secret, variantId, outDir, serverPort));
    }
    await Promise.all(tasks);
  }
  await context.close();
  await browser.close();
}

export type PdfOptions = {
  dir: string;
  config: string;
  outDir: string;
  contestId: string;
  server: boolean;
  port: number;
};

export default async function pdf(options: PdfOptions) {
  const config = await loadGenerationConfig(options.config);
  const server = await pdfServer(options.dir, config[options.contestId], options.port);

  if (!options.server) {
    await printVariants(
      config[options.contestId],
      join(options.outDir, options.contestId),
      options.port,
    );
    server.close();
  }
}
