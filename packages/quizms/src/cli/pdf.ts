import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, type PDFPageDrawTextOptions, StandardFonts } from "@cantoo/pdf-lib";
import { range, uniq } from "lodash-es";
import { type BrowserContext, chromium } from "playwright";

import type { Contest } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { statementString } from "~/utils";
import { withProgress } from "~/utils-node";

/** A contest as printed by `quizms print`, with its languages already resolved. */
export type PrintContest = Contest &
  VariantsConfig & {
    /** Whether variants have one statement per language (`statement.<lang>.txt`) */
    multilingual: boolean;
    /** Statement file of each language being printed */
    statementFiles: Record<string, string>;
    /** Translated header files (relative to `src`) by language */
    headerTranslations: Record<string, string>;
  };

async function generatePdf(
  context: BrowserContext,
  contest: PrintContest,
  baseUrl: string,
  variant: string,
  language: string,
  outDir: string,
) {
  const page = await context.newPage();
  const query = new URLSearchParams({ v: variant, lang: language });
  await page.goto(`${baseUrl}/${contest.id}?${query}`, { waitUntil: "load" });
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

    // Single-language contests keep the original (Italian) footer.
    const variantLabel = statementString(contest.multilingual ? language : undefined, "variant");
    page.drawText(contest.hasVariants ? `${variantLabel} ${variant}` : contest.name, {
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

  const variantDir = path.join(outDir, contest.id, variant);
  await mkdir(variantDir, { recursive: true });
  if (contest.multilingual) {
    await writeFile(path.join(variantDir, `statement.${language}.pdf`), pdf);
  }
  if (!contest.multilingual || language === contest.languages[0]) {
    await writeFile(path.join(variantDir, "statement.pdf"), pdf);
  }
}

export default async function generatePdfs(
  contests: PrintContest[],
  baseUrl: string,
  outDir: string,
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const ids = contests.flatMap((contest) => {
    return uniq([...contest.variantIds, ...contest.pdfVariantIds]).flatMap((id) =>
      contest.languages.map((language) => [contest, id, language] as const),
    );
  });

  await withProgress(ids, ids.length, ([contest, id, language]) =>
    generatePdf(context, contest, baseUrl, id, language, outDir),
  );

  await context.close();
  await browser.close();
}
