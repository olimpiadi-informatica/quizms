import type { ChildProcess } from "node:child_process";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { launchChromium } from "./browser";
import { createProject, freePort, killProcessTree, type Project } from "./project";

let project: Project | undefined;
let devServer: ChildProcess | undefined;
let baseUrl: string;
let output = "";
let browser: any;
let page: any;
const pageErrors: string[] = [];

async function waitForServer(url: string, timeout: number) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (devServer?.exitCode != null) {
      throw new Error(`quizms dev exited with code ${devServer.exitCode}:\n${output}`);
    }
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    if (Date.now() > deadline) throw new Error(`quizms dev did not start:\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

beforeAll(async () => {
  project = await createProject("dev");
  const port = await freePort();
  baseUrl = `http://localhost:${port}`;

  devServer = project.spawnQuizms(["dev", "--port", String(port)]);
  devServer.stdout?.on("data", (data) => {
    output += data;
  });
  devServer.stderr?.on("data", (data) => {
    output += data;
  });
  await waitForServer(`${baseUrl}/smoke`, 60_000);

  browser = await launchChromium();
});

afterAll(async () => {
  // Each step runs even if a previous one fails, so that nothing is left running.
  await Promise.allSettled([browser?.close(), killProcessTree(devServer)]);
  await project?.remove();
});

beforeEach(async () => {
  const context = await browser.newContext({ locale: "it-IT", timezoneId: "Europe/Rome" });
  // No network: only the dev server is reachable, the clock-sync request gets the local time.
  await context.route(
    (url: URL) => url.origin !== baseUrl,
    (route: any) => {
      if (route.request().url().startsWith("https://time1.olinfo.it")) {
        return route.fulfill({ status: 200, contentType: "text/plain", body: String(Date.now()) });
      }
      return route.abort();
    },
  );
  page = await context.newPage();
  pageErrors.length = 0;
  page.on("pageerror", (err: Error) => pageErrors.push(err.message));
});

function problem(text: string) {
  return page.locator(".break-inside-avoid", { hasText: text });
}

describe("quizms dev", () => {
  it("lists the contests on the home page", async () => {
    await page.goto(baseUrl);
    const link = page.getByRole("link", { name: "Smoke test" });
    await link.waitFor();
    expect(await link.getAttribute("href")).toBe("/smoke");
  });

  it("renders the contest with header and problems, and records answers", async () => {
    await page.goto(`${baseUrl}/smoke`);
    await problem("Quanto fa sei per sette?").waitFor({ timeout: 30_000 });

    expect(await page.getByText("Benvenuti alla gara di prova.").isVisible()).toBe(true);
    expect(await page.getByRole("heading", { name: /^Domanda \d$/ }).count()).toBe(4);
    expect(await page.getByText("0%").isVisible()).toBe(true);

    await problem("colore del cielo").getByText("Azzurro").click();
    await problem("sei per sette").getByLabel("Risposta").fill("42");
    await expect
      .poll(() =>
        page
          .getByText(/^\d+%$/)
          .first()
          .textContent(),
      )
      .toBe("50%");
    expect(pageErrors).toEqual([]);
  });

  it("translates header and statement when switching language", async () => {
    await page.goto(`${baseUrl}/smoke`);
    await problem("Quanto fa sei per sette?").waitFor({ timeout: 30_000 });
    await problem("sei per sette").getByLabel("Risposta").fill("42");

    await page.getByRole("combobox", { name: "Lingua / Language" }).selectOption("en");

    await page.getByText("Welcome to the test contest.").waitFor();
    await problem("What is six times seven?").waitFor();
    expect(await page.getByText("Benvenuti alla gara di prova.").count()).toBe(0);
    expect(await page.getByRole("heading", { name: "Only section" }).isVisible()).toBe(true);
    // The UI follows the statement language.
    expect(await problem("six times seven").getByLabel("Answer").inputValue()).toBe("42");
    expect(new URL(page.url()).searchParams.get("lang")).toBe("en");
    expect(pageErrors).toEqual([]);
  });
});
