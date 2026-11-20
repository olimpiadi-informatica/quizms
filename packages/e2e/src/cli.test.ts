import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createProject, type Project } from "./project";

const variantIds = ["101", "102", "103"];
const languages = ["it", "en"];

/** Original problem ids of the fixture and their answer types. */
const problems = {
  "1": "multipleChoice",
  "2": "multipleResponse",
  "3": "openNumber",
  "4": "openText",
};

let project: Project;

beforeAll(async () => {
  project = await createProject("cli");
});

afterAll(async () => {
  await project?.remove();
});

describe("quizms variants", () => {
  let variantsDir: string;

  beforeAll(async () => {
    await project.quizms(["variants"]);
    variantsDir = path.join(project.dir, "variants", "smoke");
  });

  it("generates every variant", async () => {
    expect((await readdir(variantsDir)).sort()).toEqual(variantIds);
  });

  it("writes the statement of each language, the default one and the client module", async () => {
    for (const variant of variantIds) {
      const files = await readdir(path.join(variantsDir, variant));
      expect(files).toEqual(
        expect.arrayContaining([
          "answers.json",
          "statement.txt",
          "statement.it.txt",
          "statement.en.txt",
        ]),
      );
      expect(files.filter((f) => f.endsWith(".mjs"))).toHaveLength(1);

      const read = (file: string) => readFile(path.join(variantsDir, variant, file), "utf8");
      const [defaultStatement, it, en] = await Promise.all([
        read("statement.txt"),
        read("statement.it.txt"),
        read("statement.en.txt"),
      ]);
      expect(defaultStatement).toBe(it);

      expect(it).toContain("Sezione unica");
      expect(it).toContain("Quanto fa sei per sette?");
      expect(it).toContain("Azzurro");
      expect(it).not.toContain("What is six times seven?");

      expect(en).toContain("Only section");
      expect(en).toContain("What is six times seven?");
      expect(en).toContain("Blue");
      expect(en).not.toContain("Quanto fa sei per sette?");
    }
  });

  it("writes a schema with every problem, with the right types and solutions", async () => {
    for (const variant of variantIds) {
      const answers = JSON.parse(
        await readFile(path.join(variantsDir, variant, "answers.json"), "utf8"),
      );
      expect(answers).toMatchObject({
        id: variant,
        contestId: "smoke",
        isOnline: true,
        isPdf: false,
      });

      const schema = Object.values(answers.schema) as any[];
      expect(Object.keys(answers.schema).sort()).toEqual(["1", "2", "3", "4"]);

      const byOriginalId = Object.fromEntries(schema.map((p) => [p.originalId, p]));
      expect(
        Object.fromEntries(Object.entries(byOriginalId).map(([id, p]) => [id, p.type])),
      ).toEqual(problems);

      for (const problem of schema) {
        expect(problem).toMatchObject({ pointsCorrect: 5, pointsBlank: 1, pointsWrong: 0 });
      }
      expect(byOriginalId["3"].correct).toEqual([42]);
      expect(byOriginalId["4"].correct).toEqual(["QUIZ"]);

      // Options are shuffled, but the correct ones stay the same.
      const correctOriginalIds = (p: any) =>
        p.options
          .filter((o: any) => o.correct)
          .map((o: any) => o.originalId)
          .sort();
      expect(byOriginalId["1"].options).toHaveLength(3);
      expect(correctOriginalIds(byOriginalId["1"])).toEqual(["A"]);
      expect(correctOriginalIds(byOriginalId["2"])).toEqual(["A", "C"]);
    }
  });

  it("is deterministic for a variant", async () => {
    const first = await readFile(path.join(variantsDir, "101", "answers.json"), "utf8");
    await project.quizms(["variants", "--outDir", "variants-again"]);
    const second = await readFile(
      path.join(project.dir, "variants-again", "smoke", "101", "answers.json"),
      "utf8",
    );
    expect(second).toBe(first);
  });

  it("builds only the requested languages with --languages", async () => {
    await project.quizms(["variants", "--languages", "en", "--outDir", "variants-en"]);
    const dir = path.join(project.dir, "variants-en", "smoke", "101");
    const files = await readdir(dir);
    expect(files).toContain("statement.en.txt");
    expect(files).not.toContain("statement.it.txt");
    expect(await readFile(path.join(dir, "statement.txt"), "utf8")).toContain(
      "What is six times seven?",
    );
  });
});

describe("quizms build", () => {
  let buildDir: string;

  beforeAll(async () => {
    buildDir = path.join(project.dir, "build");
    await project.quizms(["build", "--outDir", "build"]);
  });

  it("exports the training website", async () => {
    const files = await readdir(buildDir);
    expect(files).toEqual(
      expect.arrayContaining(["smoke.html", "contests.json", "LICENSES.txt", "assets"]),
    );
  });

  it("writes the contest configuration, merged with the variants configuration", async () => {
    const contests = JSON.parse(await readFile(path.join(buildDir, "contests.json"), "utf8"));
    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "smoke",
      name: "Smoke test",
      problemIds: ["1", "2", "3", "4"],
      languages,
      variantIds,
      entry: "contest/contest.mdx",
    });
  });

  it("generates an HTML page loading the entry with an import map", async () => {
    const html = await readFile(path.join(buildDir, "smoke.html"), "utf8");
    expect(html).toContain('<script type="importmap">');
    const scripts = [...html.matchAll(/<script type="module"[^>]*src="\/([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(existsSync(path.join(buildDir, script)), script).toBe(true);
    }
  });
});
