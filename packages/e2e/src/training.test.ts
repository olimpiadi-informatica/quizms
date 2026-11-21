import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { launchChromium, serveStatic } from "./browser";
import { createProject, type Project } from "./project";

let project: Project | undefined;
let server: Awaited<ReturnType<typeof serveStatic>> | undefined;
let browser: any;
let page: any;
const pageErrors: string[] = [];

beforeAll(async () => {
  project = await createProject("training");
  await project.quizms(["variants"]);
  await project.quizms(["build", "--outDir", "build"]);

  // Like a static hosting of the training website, with the variants under `/variants`.
  server = await serveStatic({
    "/": path.join(project.dir, "build"),
    "/variants": path.join(project.dir, "variants"),
  });

  browser = await launchChromium();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
  await project?.remove();
});

beforeEach(async () => {
  const context = await browser.newContext({ locale: "it-IT", timezoneId: "Europe/Rome" });
  // No network: the page only talks to the local server, and the clock-sync request
  // (`DatePolyfill` in `@olinfo/quizms/entry`) gets the local time.
  await context.route(
    (url: URL) => url.origin !== server!.url,
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

/** The answer box of the problem whose statement contains `text`. */
function problem(text: string) {
  return page.locator(".break-inside-avoid", { hasText: text });
}

async function start(query = "") {
  await page.goto(`${server!.url}/smoke${query}`);
  // The UI is in the statement language.
  const label = query.includes("lang=en") ? "Start" : "Inizia";
  await page.getByRole("button", { name: label }).click();
}

describe("training website", () => {
  it("runs a contest: answer, submit and see the score", async () => {
    await start();

    await expect.poll(() => problem("Quanto fa sei per sette?").count()).toBe(1);
    expect(await page.getByText("Benvenuti alla gara di prova.").isVisible()).toBe(true);
    expect(await page.getByRole("heading", { name: "Gara di prova end-to-end" }).isVisible()).toBe(
      true,
    );

    // Two correct answers, a wrong one and a blank one: 5 + 5 + 0 + 1.
    await problem("colore del cielo").getByText("Azzurro").click();
    await problem("numeri sono pari").getByText("Due").click();
    await problem("numeri sono pari").getByText("Quattro").click();
    await problem("sei per sette").getByLabel("Risposta").fill("41");

    await expect
      .poll(() =>
        page
          .getByText(/^\d+%$/)
          .first()
          .textContent(),
      )
      .toBe("75%");

    await page.getByRole("button", { name: "Termina" }).click();
    const confirm = page.locator("dialog[open]", { hasText: "Confermi di voler terminare?" });
    await confirm.getByRole("button", { name: "Conferma" }).click();

    const completed = page.locator("dialog[open]", { hasText: "Prova terminata" });
    await completed.waitFor();
    expect(await completed.getByText(/Hai ottenuto un punteggio di/).textContent()).toBe(
      "Hai ottenuto un punteggio di 11 su 20.",
    );

    // After the end the answers are read-only.
    await page.keyboard.press("Escape");
    expect(await problem("sei per sette").getByLabel("Risposta").isDisabled()).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  it("switches the statement language keeping the answers", async () => {
    await start();
    await problem("sei per sette").getByLabel("Risposta").fill("42");

    const select = page.getByRole("combobox", { name: "Lingua / Language" });
    expect(await select.inputValue()).toBe("it");
    await select.selectOption("en");

    await expect.poll(() => problem("What is six times seven?").count()).toBe(1);
    expect(await page.getByText("Quanto fa sei per sette?").count()).toBe(0);
    // The UI follows the statement language.
    expect(await problem("six times seven").getByLabel("Answer").inputValue()).toBe("42");
    expect(new URL(page.url()).searchParams.get("lang")).toBe("en");
    // Fixed strings of the statement are translated too.
    expect(await page.getByRole("heading", { name: /^Question \d$/ }).count()).toBe(4);
    expect(pageErrors).toEqual([]);
  });

  it("opens in the language of the URL", async () => {
    await start("?lang=en");
    await expect.poll(() => problem("Which of these numbers are even?").count()).toBe(1);
    // Texts of the configuration are translated too.
    expect(
      await page.getByRole("heading", { name: "End-to-end test contest" }).isVisible(),
    ).toBe(true);
  });

  it("translates the contest header", async () => {
    await start("?lang=en");
    await expect
      .poll(() => page.getByText("Welcome to the test contest.").count(), { timeout: 5_000 })
      .toBe(1);
  });
});
