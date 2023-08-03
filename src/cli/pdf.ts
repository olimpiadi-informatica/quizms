import { join } from "node:path";
import { cwd } from "node:process";

import { chromium } from "playwright";
import { createServer } from "vite";

import configs from "./vite/configs";

export type PdfOptions = {
  dir?: string;
  outDir?: string;
  variant?: string;
};

export default async function pdf(options: PdfOptions) {
  const root = join(cwd(), options.dir ?? ".");

  if (options.variant) {
    process.env.QUIZMS_VARIANT = options.variant;
  }

  const variant = options.variant?.padStart(5, "0") ?? "default";
  const pdfPath = join(root, "pdf", `contest-${variant}.pdf`);

  const server = await createServer({
    ...configs("production"),
    root,
  });
  await server.listen();

  const url = server.resolvedUrls!.local[0];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "load" });

  await new Promise((resolve) => setTimeout(resolve, 500));

  await page.pdf({
    path: pdfPath,
    format: "a4",
  });

  await context.close();
  await browser.close();
  await server.close();
}
