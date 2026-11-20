// End-to-end test of the statement compiler: the fixture contest in `test/fixtures/contest` is
// compiled by the MDX plugin chain and `resolve-mdx-components` in a Vite SSR server, rendered with
// the schema components and the schema JSX runtime (as `quizms variants` does), and parsed by
// `parseRawSchema`.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { hash } from "@olinfo/quizms/utils";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { parseRawSchema } from "~/schema/parse";

import mdx from "./mdx";
import resolveMdxComponents from "./resolve-mdx-components";

vi.mock("@olinfo/quizms/utils-node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@olinfo/quizms/utils-node")>()),
  // `fatal` exits the process.
  fatal: (message: string) => {
    throw new Error(message);
  },
}));

const src = path.resolve(fileURLToPath(import.meta.url), "../..");
const contestDir = path.resolve(src, "../test/fixtures/contest");
const contestEntry = path.join(contestDir, "contest.mdx");

/** Tells `resolve-mdx-components` the languages of the contest, like `quizms variants`. */
function setContestLanguages(languages: string[]) {
  vi.stubEnv(
    "QUIZMS_CONTEST_LANGUAGES",
    JSON.stringify([{ entry: contestEntry, languages, baseLanguage: "it", known: languages }]),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolve-mdx-components", () => {
  /** The source of the virtual module that provides the components to the contest. */
  async function componentsModule(command: "build" | "serve") {
    const plugin = resolveMdxComponents() as Plugin;
    (plugin.configResolved as any)({ command });
    const id = (plugin.resolveId as any)("virtual:quizms-mdx-components", contestEntry);
    const code: string = await (plugin.load as any)(id);
    return code.replaceAll(contestDir, "<contest>");
  }

  it("generates a dispatcher for each translated problem", async () => {
    setContestLanguages(["it", "en"]);
    expect(await componentsModule("build")).toMatchInlineSnapshot(`
      "import { createElement as _createElement, Fragment as _Fragment } from "react";
      import {
        useMDXComponents as useQuizMSComponents,
        useStatementLanguage as _useStatementLanguage,
      } from "@olinfo/quizms-mdx/components";

      // Taken from the components map: a re-export-only binding of a client component would make
      // the RSC bundle import the client module's dependencies on the server.
      const { StatementLanguageProvider: _StatementLanguageProvider } = useQuizMSComponents();

      function _missingTranslation(problem, lang) {
        return _createElement(
          "div",
          { role: "alert", className: "alert alert-warning not-prose my-2" },
          "Missing translation (" + lang + ") for " + problem + ": showing the default language.",
        );
      }

      import P1Open$base from "<contest>/p-1-open/question.md";
      import P1Open$en from "<contest>/p-1-open/question.en.md";
      import P2Closed$base from "<contest>/p-2-closed/question.md";
      import P2Closed$en from "<contest>/p-2-closed/question.en.md";
      import P3Blockly$base from "<contest>/p-3-blockly/question.mdx";
      import P3Blockly$en from "<contest>/p-3-blockly/question.en.mdx";

      const P1Open$all = { "en": P1Open$en };
      const P1Open$missing = [];
      function P1Open(props) {
        const lang = _useStatementLanguage();
        const Component = Object.hasOwn(P1Open$all, lang) ? P1Open$all[lang] : P1Open$base;
        const content = _createElement(Component, props);
        const children = P1Open$missing.includes(lang)
          ? _createElement(_Fragment, null, _missingTranslation("P1Open", lang), content)
          : content;
        return lang ? _createElement(_StatementLanguageProvider, { language: lang }, children) : children;
      }

      const P2Closed$all = { "en": P2Closed$en };
      const P2Closed$missing = [];
      function P2Closed(props) {
        const lang = _useStatementLanguage();
        const Component = Object.hasOwn(P2Closed$all, lang) ? P2Closed$all[lang] : P2Closed$base;
        const content = _createElement(Component, props);
        const children = P2Closed$missing.includes(lang)
          ? _createElement(_Fragment, null, _missingTranslation("P2Closed", lang), content)
          : content;
        return lang ? _createElement(_StatementLanguageProvider, { language: lang }, children) : children;
      }

      const P3Blockly$all = { "en": P3Blockly$en };
      const P3Blockly$missing = [];
      function P3Blockly(props) {
        const lang = _useStatementLanguage();
        const Component = Object.hasOwn(P3Blockly$all, lang) ? P3Blockly$all[lang] : P3Blockly$base;
        const content = _createElement(Component, props);
        const children = P3Blockly$missing.includes(lang)
          ? _createElement(_Fragment, null, _missingTranslation("P3Blockly", lang), content)
          : content;
        return lang ? _createElement(_StatementLanguageProvider, { language: lang }, children) : children;
      }

      export function useMDXComponents() {
        return {
          ...useQuizMSComponents(),
          P1Open,P2Closed,P3Blockly
        };
      }"
    `);
  });

  it("requires all the translations when building", async () => {
    setContestLanguages(["it", "en", "fr"]);
    await expect(componentsModule("build")).rejects.toThrow(
      "Missing translations:\n  - p-1-open: fr\n  - p-2-closed: fr\n  - p-3-blockly: fr",
    );
  });

  it("falls back to the default language in development", async () => {
    setContestLanguages(["it", "en", "fr"]);
    const code = await componentsModule("serve");
    expect(code).toContain('const P1Open$missing = ["fr"];');
    expect(code).toContain("_missingTranslation(");
  });
});

describe("contest schema", () => {
  let server: ViteDevServer;
  let Contest: ComponentType;

  beforeAll(async () => {
    setContestLanguages(["it", "en"]);
    server = await createServer({
      configFile: false,
      root: contestDir,
      mode: "production",
      logLevel: "silent",
      appType: "custom",
      server: { middlewareMode: true, hmr: false, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
      plugins: [mdx(), resolveMdxComponents()],
      resolve: {
        // Same aliases and conditions as the schema build of `quizms variants`.
        alias: [
          { find: /^react\/jsx-runtime$/, replacement: path.join(src, "schema/jsx-runtime.ts") },
          {
            find: /^@olinfo\/quizms-mdx\/components$/,
            replacement: path.join(src, "components/schema/index.ts"),
          },
          { find: /^~\//, replacement: `${src}/` },
        ],
      },
    });
    ({ default: Contest } = await server.ssrLoadModule(contestEntry));
  });

  afterAll(async () => {
    await server?.close();
  });

  function schema(env: Record<string, string>) {
    vi.stubEnv("QUIZMS_VARIANT_HASH", "123456789");
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return parseRawSchema(renderToStaticMarkup(createElement(Contest)));
  }

  // The variant of `p-1-open`, chosen like in the compiled statement.
  const MODULE = 14_985_317;
  const variant = ((123_456_789 % MODULE) * (hash("p-1-open") % MODULE)) % 3;
  const n = [3, 4, 5][variant];

  it("generates the schema of the contest", () => {
    expect(schema({ QUIZMS_LANGUAGE: "it" })).toMatchInlineSnapshot(`
      {
        "1.1": {
          "correct": [
            8,
          ],
          "originalId": "1.1",
          "pointsBlank": 1,
          "pointsCorrect": 5,
          "pointsWrong": 0,
          "type": "openNumber",
        },
        "1.2": {
          "correct": [
            "ciao",
          ],
          "originalId": "1.2",
          "pointsBlank": 1,
          "pointsCorrect": 5,
          "pointsWrong": 0,
          "type": "openText",
        },
        "2.1": {
          "options": [
            {
              "correct": false,
              "id": "A",
              "originalId": "A",
            },
            {
              "correct": true,
              "id": "B",
              "originalId": "B",
            },
            {
              "correct": false,
              "id": "C",
              "originalId": "C",
            },
          ],
          "originalId": "2.1",
          "pointsBlank": 1,
          "pointsCorrect": 5,
          "pointsWrong": 0,
          "type": "multipleChoice",
        },
        "2.2": {
          "options": [
            {
              "correct": true,
              "id": "A",
              "originalId": "A",
            },
            {
              "correct": true,
              "id": "B",
              "originalId": "B",
            },
            {
              "correct": false,
              "id": "C",
              "originalId": "C",
            },
          ],
          "originalId": "2.2",
          "pointsBlank": 1,
          "pointsCorrect": 5,
          "pointsWrong": 0,
          "type": "multipleResponse",
        },
        "3": {
          "numTestcases": 2,
          "originalId": "3",
          "pointsBlank": 0,
          "pointsCorrect": 10,
          "pointsWrong": 0,
          "type": "blockly",
        },
      }
    `);
  });

  it("selects the variant of the problem", () => {
    expect(schema({ QUIZMS_LANGUAGE: "it" })["1.1"]).toMatchObject({ correct: [2 * n] });
  });

  it("generates the same schema in every language", () => {
    const it = schema({ QUIZMS_LANGUAGE: "it" });
    expect(schema({ QUIZMS_LANGUAGE: "en" })).toEqual(it);
    expect(schema({})).toEqual(it);
  });

  it("renders the statement in the requested language", async () => {
    const id = `\0virtual:quizms-mdx-components?importer=${encodeURIComponent(contestEntry)}`;
    const { useMDXComponents } = await server.ssrLoadModule(id);
    const { P1Open } = useMDXComponents();
    const load = async (file: string) =>
      (await server.ssrLoadModule(path.join(contestDir, file))).default;

    vi.stubEnv("QUIZMS_LANGUAGE", "en");
    const en = P1Open({});
    expect(en.props.language).toBe("en");
    expect(en.props.children.type).toBe(await load("p-1-open/question.en.md"));

    vi.stubEnv("QUIZMS_LANGUAGE", "it");
    expect(P1Open({}).props.children.type).toBe(await load("p-1-open/question.md"));

    vi.stubEnv("QUIZMS_LANGUAGE", "");
    expect(P1Open({}).type).toBe(await load("p-1-open/question.md"));
  });

  it("shuffles problems and answers", () => {
    const base = schema({});
    const shuffled = schema({
      QUIZMS_SHUFFLE_PROBLEMS: "true",
      QUIZMS_SHUFFLE_ANSWERS: "true",
    });
    expect(shuffled).not.toEqual(base);
    expect(Object.keys(shuffled)).toEqual(Object.keys(base));

    // Each problem keeps its original id, and each option its original letter.
    const byOriginalId = (s: typeof base) =>
      Object.fromEntries(
        Object.values(s).map(({ originalId, ...problem }) => [
          originalId,
          "options" in problem
            ? {
                ...problem,
                options: problem.options
                  .map((option) => ({ ...option, id: undefined }))
                  .sort((a, b) => a.originalId.localeCompare(b.originalId)),
              }
            : problem,
        ]),
      );
    expect(byOriginalId(shuffled)).toEqual(byOriginalId(base));

    // Same seed, same order.
    expect(schema({ QUIZMS_SHUFFLE_PROBLEMS: "true", QUIZMS_SHUFFLE_ANSWERS: "true" })).toEqual(
      shuffled,
    );
  });
});
