import { readFile } from "node:fs/promises";
import path from "node:path";

import { languageCodeRegex, reactComponentCase } from "@olinfo/quizms/utils";
import { getContestLanguages } from "@olinfo/quizms/utils-node";
import { glob } from "tinyglobby";
import type { PluginOption, ViteDevServer } from "vite";

const virtualId = "virtual:quizms-mdx-components";

/** `question.md`, `question.mdx`, `question.en.md`, ... */
const questionFileRegex = /^question(?:\.([^.]+))?\.mdx?$/;

type ProblemFiles = {
  name: string;
  /** `question.md` (or `.mdx`), the statement in the default language */
  base?: string;
  /** `question.<lang>.md` files, by language */
  translations: Map<string, string>;
};

export default function resolveMdxComponents(): PluginOption {
  let isDev = false;

  return {
    name: "quizms:resolve-mdx-components",
    config: () => ({
      optimizeDeps: {
        exclude: [virtualId],
      },
    }),
    configResolved(config) {
      isDev = config.command === "serve";
    },
    configureServer(server) {
      // Adding or removing a translation changes the generated dispatchers.
      const onChange = (file: string) => {
        if (questionFileRegex.test(path.basename(file))) invalidate(server);
      };
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
    resolveId(id, importer) {
      if (id === virtualId) {
        return `\0${id}?importer=${encodeURIComponent(importer ?? "")}`;
      }
    },
    async load(id) {
      const [pathname, query] = id.split("?");
      if (pathname !== `\0${virtualId}`) return;

      const importer = new URLSearchParams(query).get("importer");

      let problems: ProblemFiles[] = [];
      let missing: Map<string, string[]> = new Map();
      if (importer) {
        const dir = path.dirname(importer);
        const files = await glob("*/question{,.*}.{md,mdx}", { cwd: dir });
        const importerPath = importer.split("?")[0];
        const contest = getContestLanguages(importerPath);
        const used = contest ? await usedComponents(importerPath) : undefined;
        ({ problems, missing } = collectProblems(dir, files, contest, used, isDev));
      }

      return generateModule(problems, missing, isDev);
    },
  };
}

function invalidate(server: ViteDevServer) {
  for (const environment of Object.values(server.environments)) {
    for (const [id, module] of environment.moduleGraph.idToModuleMap) {
      if (id.startsWith(`\0${virtualId}`)) {
        environment.moduleGraph.invalidateModule(module);
      }
    }
  }
  server.ws.send({ type: "full-reload" });
}

/** Names of the JSX components used in a file (e.g. `P1SaltoOstacoli` for `<P1SaltoOstacoli />`). */
async function usedComponents(file: string) {
  const source = await readFile(file, "utf8").catch(() => undefined);
  if (source === undefined) return;
  return new Set(Array.from(source.matchAll(/<([A-Z][\w$]*)/g), (match) => match[1]));
}

function collectProblems(
  dir: string,
  files: string[],
  contest: ReturnType<typeof getContestLanguages>,
  used: Set<string> | undefined,
  isDev: boolean,
) {
  const errors: string[] = [];
  const problems = new Map<string, ProblemFiles>();

  for (const file of files.sort()) {
    const problemDir = path.dirname(file);
    const fileName = path.basename(file);
    const fullPath = path.join(dir, file);

    let problem = problems.get(problemDir);
    if (!problem) {
      problem = { name: reactComponentCase(problemDir), translations: new Map() };
      problems.set(problemDir, problem);
    }

    const match = questionFileRegex.exec(fileName);
    const lang = match?.[1];
    if (!match) {
      errors.push(
        `\`${file}\`: invalid file name, expected \`question.md\` or \`question.<lang>.md\`.`,
      );
    } else if (lang === undefined) {
      if (problem.base) {
        errors.push(`\`${problemDir}\`: both \`question.md\` and \`question.mdx\` exist.`);
      }
      problem.base = fullPath;
    } else if (!languageCodeRegex.test(lang)) {
      errors.push(
        `\`${file}\`: \`${lang}\` is not a valid language code, expected two lowercase letters (e.g. \`question.en.md\`).`,
      );
    } else if (contest && !contest.known.includes(lang)) {
      errors.push(
        `\`${file}\`: language \`${lang}\` is not configured for this contest (configured: ${contest.known.join(", ")}).`,
      );
    } else if (contest && lang === contest.baseLanguage) {
      errors.push(
        `\`${file}\`: \`${lang}\` is the default language, its statement must be named \`question.md\`.`,
      );
    } else if (problem.translations.has(lang)) {
      errors.push(`\`${problemDir}\`: multiple files for language \`${lang}\`.`);
    } else {
      problem.translations.set(lang, fullPath);
    }
  }

  for (const [problemDir, problem] of problems) {
    if (!problem.base) {
      errors.push(
        `\`${problemDir}\`: missing \`question.md\`, the statement in the default language.`,
      );
    }
  }

  // Every problem used by the contest must have a statement in every language being built.
  // In dev, missing translations fall back to the default language and show a warning instead.
  const missing = new Map<string, string[]>();
  if (contest) {
    for (const [problemDir, problem] of problems) {
      if (used && !used.has(problem.name)) continue;
      const langs = contest.languages.filter(
        (lang) => lang !== contest.baseLanguage && !problem.translations.has(lang),
      );
      if (langs.length > 0) missing.set(problemDir, langs);
    }
    if (!isDev && missing.size > 0) {
      errors.push(
        `Missing translations:\n${[...missing]
          .map(([problemDir, langs]) => `  - ${problemDir}: ${langs.join(", ")}`)
          .join("\n")}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid problem statements in \`${dir}\`:\n${errors.map((e) => `- ${e}`).join("\n")}`,
    );
  }

  return {
    problems: [...problems.values()].filter((problem) => problem.base),
    missing: new Map(
      [...missing].map(([problemDir, langs]) => [problems.get(problemDir)!.name, langs]),
    ),
  };
}

function generateModule(problems: ProblemFiles[], missing: Map<string, string[]>, isDev: boolean) {
  const multilingual = problems.filter((problem) => problem.translations.size > 0);
  const needsDispatcher = multilingual.length > 0 || (isDev && missing.size > 0);

  const imports: string[] = [];
  const dispatchers: string[] = [];

  for (const problem of problems) {
    const missingLangs = isDev ? (missing.get(problem.name) ?? []) : [];
    if (problem.translations.size === 0 && missingLangs.length === 0) {
      // Single-language problem: same output as before multilingual support.
      imports.push(`import ${problem.name} from ${JSON.stringify(problem.base)};`);
      continue;
    }

    const name = problem.name;
    imports.push(`import ${name}$base from ${JSON.stringify(problem.base)};`);
    const entries: string[] = [];
    for (const [lang, file] of problem.translations) {
      imports.push(`import ${name}$${lang} from ${JSON.stringify(file)};`);
      entries.push(`${JSON.stringify(lang)}: ${name}$${lang}`);
    }

    dispatchers.push(`\
const ${name}$all = { ${entries.join(", ")} };
const ${name}$missing = ${JSON.stringify(missingLangs)};
function ${name}(props) {
  const lang = _useStatementLanguage();
  const Component = Object.hasOwn(${name}$all, lang) ? ${name}$all[lang] : ${name}$base;
  const content = _createElement(Component, props);
  const children = ${name}$missing.includes(lang)
    ? _createElement(_Fragment, null, _missingTranslation(${JSON.stringify(name)}, lang), content)
    : content;
  return lang ? _createElement(_StatementLanguageProvider, { language: lang }, children) : children;
}`);
  }

  const header = needsDispatcher
    ? `\
import { createElement as _createElement, Fragment as _Fragment } from "react";
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
}`
    : `import { useMDXComponents as useQuizMSComponents } from "@olinfo/quizms-mdx/components";`;

  return `\
${header}

${imports.join("\n")}

${dispatchers.join("\n\n")}

export function useMDXComponents() {
  return {
    ...useQuizMSComponents(),
    ${problems.map((problem) => problem.name)}
  };
}`;
}
