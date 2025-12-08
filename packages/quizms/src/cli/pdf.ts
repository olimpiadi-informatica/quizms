import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, type PDFPageDrawTextOptions, StandardFonts } from "@cantoo/pdf-lib";
import { range, uniq } from "lodash-es";
import { type BrowserContext, chromium } from "playwright";

import type { Contest } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { fatal, withProgress } from "~/utils-node";

async function generatePdf(
  context: BrowserContext,
  contest: Contest,
  baseUrl: string,
  variant: string,
  outDir: string,
) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${contest.id}?v=${variant}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.waitForSelector("#loading", { strict: true, state: "detached" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }

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

    page.drawText(contest.hasVariants ? `Variante ${variant}` : contest.name, {
      ...fontOptions,
      x: 15,
      y: 13,
    });

    const pageNumText = `${pageNum + 1}`;
    page.drawText(pageNumText, {
      ...fontOptions,
      x: width - font.widthOfTextAtSize(pageNumText, fontOptions.size!) - 15,
      y: 13,
    });
  }

  const pdf = await doc.save();

  await mkdir(path.join(outDir, contest.id, variant), { recursive: true });
  await writeFile(path.join(outDir, contest.id, variant, "statement.pdf"), pdf);
}

export default async function generatePdfs(
  contests: Contest[],
  variantConfigs: VariantsConfig[],
  baseUrl: string,
  outDir: string,
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const ids = contests.flatMap((contest) => {
    const config = variantConfigs.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }
    return uniq([...config.variantIds, ...config.pdfVariantIds]).map(
      (id) => [contest, id] as const,
    );
  });

  await withProgress(ids, ids.length, ([contest, id]) =>
    generatePdf(context, contest, baseUrl, id, outDir),
  );

  await context.close();
  await browser.close();
}
