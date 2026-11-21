import type { ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { launchChromium } from "./browser";
import { createProject, freePort, killProcessTree, type Project } from "./project";

let project: Project | undefined;
let devServer: ChildProcess | undefined;
let browser: any;
let baseUrl = "";
let output = "";

const customBlocks = `\
export default [
  { type: "start", message0: "start", nextStatement: null, colour: 20, tooltip: "", fn: () => {} },
  {
    type: "move",
    message0: "move",
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: "",
    fn: (_ctx: any, state: any) => {
      state.n += 1;
    },
  },
] satisfies any[];
`;

const visualizer = `\
"use client";
export default function Visualizer({ state }: any) {
  return <p>n = {state?.n}</p>;
}
`;

const statement = (text: string) => `\
import customBlocks from "./custom.blocks.ts";
import visualizer from "./visualizer";

export const testcases = [{ n: 1 }];

${text}

<Blockly customBlocks={customBlocks} testcases={testcases} visualizer={visualizer} />
`;

/** The fixture with a Blockly problem, `p-5-blockly`, added to the contest. */
async function addBlocklyProblem(dir: string) {
  const problemDir = path.join(dir, "src/contest/p-5-blockly");
  await mkdir(problemDir, { recursive: true });
  await writeFile(path.join(problemDir, "custom.blocks.ts"), customBlocks);
  await writeFile(path.join(problemDir, "visualizer.tsx"), visualizer);
  await writeFile(path.join(problemDir, "question.mdx"), statement("Usa i blocchi."));
  await writeFile(path.join(problemDir, "question.en.mdx"), statement("Use the blocks."));

  const contest = path.join(dir, "src/contest/contest.mdx");
  const mdx = await readFile(contest, "utf8");
  await writeFile(
    contest,
    mdx.replace(
      "<P4Text /></Problem>",
      "<P4Text /></Problem>\n  <Problem points={[5, 0, 0]}><P5Blockly /></Problem>",
    ),
  );
  const contests = path.join(dir, "data/contests.toml");
  const toml = await readFile(contests, "utf8");
  await writeFile(
    contests,
    toml.replace("problem_ids = [1, 2, 3, 4]", "problem_ids = [1, 2, 3, 4, 5]"),
  );
}

beforeAll(async () => {
  project = await createProject("blockly");
  await addBlocklyProblem(project.dir);

  const port = await freePort();
  baseUrl = `http://localhost:${port}`;
  devServer = project.spawnQuizms(["dev", "--port", String(port)]);
  devServer.stdout?.on("data", (data) => {
    output += data;
  });
  devServer.stderr?.on("data", (data) => {
    output += data;
  });

  const deadline = Date.now() + 60_000;
  for (;;) {
    if (devServer.exitCode != null) throw new Error(`quizms dev exited:\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/smoke`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error(`quizms dev did not start:\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  browser = await launchChromium();
});

afterAll(async () => {
  await Promise.allSettled([browser?.close(), killProcessTree(devServer)]);
  await project?.remove();
});

/** The names of the toolbox categories of the Blockly editor at `/smoke<query>`. */
async function toolboxCategories(query: string) {
  const context = await browser.newContext({ locale: "it-IT", timezoneId: "Europe/Rome" });
  await context.route(
    (url: URL) => url.origin !== baseUrl,
    (route: any) => {
      if (route.request().url().startsWith("https://time1.olinfo.it")) {
        return route.fulfill({ status: 200, contentType: "text/plain", body: String(Date.now()) });
      }
      return route.abort();
    },
  );
  const page = await context.newPage();
  const labels = page
    .frameLocator("iframe[src='/__blockly_iframe.html']")
    .locator(".blocklyToolboxCategoryLabel");
  try {
    for (let attempt = 0; ; attempt++) {
      await page.goto(`${baseUrl}/smoke${query}`);
      try {
        // The first visit can fail while Vite optimizes the dependencies.
        await labels.first().waitFor({ timeout: 30_000 });
        break;
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
    return await labels.allTextContents();
  } finally {
    await context.close();
  }
}

describe("blockly", () => {
  it("shows the editor in the statement language", async () => {
    expect(await toolboxCategories("")).toEqual([
      "Esecuzione",
      "Variabili",
      "Matematica",
      "Logica",
      "Cicli",
      "Liste",
    ]);
    expect(await toolboxCategories("?lang=en")).toEqual([
      "Execution",
      "Variables",
      "Math",
      "Logic",
      "Loops",
      "Lists",
    ]);
  });
});
