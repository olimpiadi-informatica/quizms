// Browser helpers: a static file server for `quizms build` output and Playwright.
import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { findDependency } from "./project";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/**
 * Serves `routes` (URL prefix → directory) on 127.0.0.1, like a static hosting would:
 * `/<page>` is served from `<page>.html`.
 */
export async function serveStatic(routes: Record<string, string>): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const prefixes = Object.keys(routes).sort((a, b) => b.length - a.length);

  const server: Server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const prefix = prefixes.find(
      (p) => pathname === p || pathname.startsWith(`${p}/`) || p === "/",
    );
    if (prefix !== undefined) {
      const root = routes[prefix];
      const relative = pathname.slice(prefix === "/" ? 0 : prefix.length);
      const file = path.join(root, path.normalize(relative));
      for (const candidate of [file, `${file}.html`, path.join(file, "index.html")]) {
        if (!candidate.startsWith(root)) break;
        const info = await stat(candidate).catch(() => undefined);
        if (info?.isFile()) {
          res.setHeader(
            "Content-Type",
            contentTypes[path.extname(candidate)] ?? "application/octet-stream",
          );
          createReadStream(candidate).pipe(res);
          return;
        }
      }
    }
    res.statusCode = 404;
    res.end("Not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/** Playwright, as installed with `@olinfo/quizms` (which uses it for `quizms print`). */
export async function loadPlaywright(): Promise<any> {
  const dir = await findDependency("playwright");
  return import(pathToFileURL(path.join(dir, "index.mjs")).href);
}

/**
 * Launches headless Chromium.
 *
 * Uses the browser of the installed Playwright version (`pnpm exec playwright install chromium`)
 * or `QUIZMS_E2E_CHROMIUM`. As a fallback for local runs, it uses the newest headless shell
 * downloaded by another Playwright version.
 */
export async function launchChromium(): Promise<any> {
  const { chromium } = await loadPlaywright();
  let executablePath: string | undefined = process.env.QUIZMS_E2E_CHROMIUM;
  if (!executablePath && !existsSync(chromium.executablePath())) {
    executablePath = await findDownloadedHeadlessShell();
    if (executablePath) {
      console.warn(
        `Chromium for this Playwright version is not installed, using ${executablePath}. Run \`pnpm exec playwright install chromium\` to install it.`,
      );
    }
  }
  return chromium.launch({ headless: true, executablePath });
}

async function findDownloadedHeadlessShell() {
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(homedir(), ".cache", "ms-playwright");
  const dirs = (await readdir(cache).catch(() => [] as string[]))
    .filter((dir) => dir.startsWith("chromium_headless_shell-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const dir of dirs) {
    const executable = path.join(
      cache,
      dir,
      "chrome-headless-shell-linux64",
      "chrome-headless-shell",
    );
    if (existsSync(executable)) return executable;
  }
}
