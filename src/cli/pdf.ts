import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import { BrowserContext, chromium } from "playwright";
import { temporaryDirectory } from "tempy";
import { InlineConfig, build, mergeConfig } from "vite";

import { parseContest } from "~/jsx-runtime/parser";

import readVariantIds from "./read-variant-ids";
import configs from "./vite/configs";

async function pdfServer(dir: string, contest: string, port: number) {
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
        entry: contest,
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
    console.log(`Server listening on port ${port}`);
  });

  app.get("/variant.js", (req, res) => {
    res.setHeader("content-type", "text/javascript");
    res.send(parseContest(contestJsx, `${req.query.variant}`));
  });

  app.use(express.static(serverDir));
  return server;
}

async function printVariant(
  context: BrowserContext,
  variant_id: string,
  outDir: string,
  serverPort: number,
) {
  const page = await context.newPage();
  const url = `localhost:${serverPort}/print.html?variant=${variant_id}`;
  const path = `${outDir}/variant_${variant_id}.pdf`;
  console.info(`Printing variant ${variant_id}`);
  await page.goto(url, { waitUntil: "load" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }
  await page.waitForTimeout(10 * 1000);
  await page.pdf({
    path,
    format: "a4",
  });
  console.info(`Printed variant ${variant_id} to file ${path}`);
  await page.close();
}

export async function printVariants(variant_ids: string[], outDir: string, serverPort: number) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const chunkSize = 10;
  for (let i = 0; i < variant_ids.length; i += chunkSize) {
    const tasks = [];
    for (const variant_id of variant_ids.slice(i, i + chunkSize)) {
      tasks.push(printVariant(context, variant_id.toString(), outDir, serverPort));
    }
    await Promise.all(tasks);
  }
  await context.close();
  await browser.close();
}

export type PdfOptions = {
  dir: string;
  outDir: string;
  variants: string;
  secret: string;
  contest: string;
  server?: boolean;
  port: number;
};

export default async function pdf(options: PdfOptions) {
  const server = await pdfServer(options.dir, options.contest, options.port);
  const variant_ids = await readVariantIds(options.variants, options.secret);

  if (!options.server) {
    await printVariants(variant_ids, options.outDir, options.port);
    server.close();
  }
}
