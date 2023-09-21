import { join } from "node:path";

import { chromium } from "playwright";
import { createServer } from "vite";

import configs from "./vite/configs";

export type PdfOptions = {
  dir: string;
  outDir: string;
  variant?: string;
};

export default async function pdf(options: PdfOptions) {
  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  const variant = options.variant?.padStart(5, "0") ?? "default";
  const pdfPath = join("pdf", `contest-${variant}.pdf`);

  process.env.QUIZMS_MODE = "pdf";

  const server = await createServer({
    ...configs("production"),
    root: join(options.dir, "src"),
    publicDir: join(options.dir, "public"),
  });
  await server.listen();

  const url = server.resolvedUrls!.local[0];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "load" });
  for (const img of await page.getByRole("img").all()) {
    await img.isVisible();
  }

  await page.pdf({
    path: pdfPath,
    format: "a4",
  });

  await context.close();
  await browser.close();
  await server.close();
}
