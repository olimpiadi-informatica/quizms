import { BrowserContext, chromium } from "playwright";

import { GenerationConfig } from "~/models/generationConfig";

import { info } from "./utils/logs";

async function printStatement(
  context: BrowserContext,
  baseUrl: string,
  variant: number,
  outFile: string,
) {
  const page = await context.newPage();
  const url = `${baseUrl}?v=${variant}`;
  info(`Printing statement ${variant}.`);
  await page.goto(url, { waitUntil: "load" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }
  await page.waitForTimeout(1000);
  await page.pdf({
    path: outFile,
    format: "a4",
  });
  await page.close();
}

export async function printStatements(configs: GenerationConfig[], outDir: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const chunkSize = 10;
  for (const config of configs) {
    for (let i = 0; i < config.pdfVariantIds.length; i += chunkSize) {
      await Promise.all(
        config.pdfVariantIds.slice(i, i + chunkSize).map(async (variantId) => {
          const path = join(outDir, "raw", `${variantId}.pdf`);
          await printStatement(context, config.baseUrl, variantId, path);
        }),
      );
    }
  }
  await context.close();
  await browser.close();
}
