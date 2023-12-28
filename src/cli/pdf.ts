import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument, PDFPageDrawTextOptions, StandardFonts } from "@cantoo/pdf-lib";
import { map, range, size, uniq } from "lodash-es";
import { BrowserContext, chromium } from "playwright";

import { GenerationConfig } from "~/models/generationConfig";

import { info } from "./utils/logs";

async function generatePdf(
  context: BrowserContext,
  baseUrl: string,
  variant: string,
  hasVariants: boolean,
  outDir: string,
) {
  info(`Printing statement ${variant}.`);
  const page = await context.newPage();
  await page.goto(`${baseUrl}?v=${variant}`, { waitUntil: "load" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }
  await page.waitForTimeout(1000);

  const basePdf = await page.pdf({
    format: "a4",
    margin: {
      top: "0.75cm",
      bottom: "1.125cm",
      left: "0.25cm",
      right: "0.25cm",
    },
  });
  await page.close();

  const doc = await PDFDocument.load(basePdf);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontOptions: PDFPageDrawTextOptions = {
    size: 14,
    font,
  };

  const pages = doc.getPages();
  for (const pageNum of range(pages.length)) {
    const page = pages[pageNum];
    const { width } = page.getSize();

    if (hasVariants) {
      page.drawText(`Variante ${variant}`, {
        ...fontOptions,
        x: 15,
        y: 13,
      });
    }

    const pageNumText = `${pageNum + 1}`;
    page.drawText(pageNumText, {
      ...fontOptions,
      x: width - font.widthOfTextAtSize(pageNumText, fontOptions.size!) - 15,
      y: 13,
    });
  }

  const pdf = await doc.save();

  await mkdir(join(outDir, variant), { recursive: true });
  await writeFile(join(outDir, variant, "statement.pdf"), pdf);
}

export default async function generatePdfs(
  configs: GenerationConfig[],
  baseUrl: string,
  outDir: string,
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const poolSize = 16;
  const promises: Record<string, Promise<void>> = {};

  for (const config of configs) {
    const ids = uniq([...config.variantIds, ...config.pdfVariantIds]).slice(0, 10); // TODO: remove
    for (const id of ids) {
      if (size(promises) >= poolSize) {
        const oldId = await Promise.any(map(promises, (promise, id) => promise.then(() => id)));
        delete promises[oldId];
      }
      promises[id] = generatePdf(context, baseUrl, id, config.hasVariants, outDir);
    }
  }

  await Promise.all(Object.values(promises));

  await context.close();
  await browser.close();
}
