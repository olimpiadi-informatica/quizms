import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import { PDFDocument } from "pdf-lib";
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
  seed: string,
  path: string,
  serverPort: number,
) {
  const page = await context.newPage();
  const url = `localhost:${serverPort}/print.html?variant=${seed}`;
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
  for (let i = 0; i < config.pdfVariantIds.length; i += chunkSize) {
    await Promise.all(
      config.pdfVariantIds.slice(i, i + chunkSize).map(async (variantId) => {
        const seed = `${config.secret}${variantId}`;
        const path = join(outDir, "raw", `${variantId}.pdf`);
        await printVariant(context, seed, path, serverPort);
      }),
    );
  }
  await context.close();
  await browser.close();
}

async function addText(
  inputPath: string,
  outputPath: string,
  variantId: string,
  contestName: string,
) {
  const pdfFile = readFileSync(inputPath);

  const doc = await PDFDocument.load(pdfFile);
  const pages = doc.getPages();
  const fontOptions = {
    size: 17,
  };
  for (const pageNum in pages) {
    const page = pages[pageNum];
    const { width, height } = page.getSize();
    page.drawText((parseInt(pageNum) + 1).toString(), {
      x: 10,
      y: 10,
      ...fontOptions,
    });
    page.drawText(`${contestName} - Variante ${variantId}`, {
      x: 10,
      y: height - fontOptions.size - 10,
      ...fontOptions,
    });
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await doc.save());
}

async function addAllText(config: ContestConfig, outDir: string) {
  const chunkSize = 10;
  for (let i = 0; i < config.pdfVariantIds.length; i += chunkSize) {
    await Promise.all(
      config.pdfVariantIds.slice(i, i + chunkSize).map(async (variantId) => {
        const inputPath = join(outDir, config.id, "raw", `${variantId}.pdf`);
        const outputPath = join(outDir, "final", `${variantId}.pdf`);
        await addText(inputPath, outputPath, variantId, config.name);
      }),
    );
  }
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
  const contest = config[options.contestId];
  const server = await pdfServer(options.dir, contest, options.port);

  if (!options.server) {
    await printVariants(contest, join(options.outDir, options.contestId), options.port);
    addAllText(contest, options.outDir);
    server.close();
  }
}
