import { existsSync } from "node:fs";
import path from "node:path";
import { cwd, env } from "node:process";

import { isEqual } from "lodash-es";

import type { VariantsConfig } from "~/models";
import { localizedFileName } from "~/utils/languages";
import { reactComponentCase } from "~/utils/strings";

/** Name of the statement file of a language in `variants/<contest>/<variant>/`. */
export function statementFileName(multilingual: boolean, language: string) {
  return multilingual ? `statement.${language}.txt` : "statement.txt";
}

/**
 * Finds the translations of a contest header (`header.<lang>.md` next to `header.md`).
 *
 * @returns the translated files (relative to `src`) by language, and the languages without one.
 */
export function findHeaderTranslations(header: string, languages: string[], baseLanguage: string) {
  const translations: Record<string, string> = {};
  const missing: string[] = [];
  for (const language of languages) {
    if (language === baseLanguage) continue;
    const file = localizedFileName(header, language);
    if (existsSync(path.join(cwd(), "src", file))) {
      translations[language] = file;
    } else {
      missing.push(language);
    }
  }
  return { translations, missing };
}

/**
 * Code for the virtual entries rendering a contest header in the current statement language.
 * The entry must import `Localized` from `@olinfo/quizms/components`.
 *
 * @param translations translated header files (relative to `src`) by language
 */
export function headerEntry(
  contestId: string,
  header: string,
  translations: Record<string, string>,
) {
  const name = `${reactComponentCase(contestId)}Header`;
  const imports = [`import ${name} from ${JSON.stringify(`/${header}`)};`];
  const entries: string[] = [];
  for (const [language, file] of Object.entries(translations)) {
    imports.push(`import ${name}$${language} from ${JSON.stringify(`/${file}`)};`);
    entries.push(`${JSON.stringify(language)}: ${name}$${language}`);
  }

  const element =
    entries.length > 0
      ? `<Localized base={${name}} translations={{ ${entries.join(", ")} }} />`
      : `<${name} />`;
  return { imports, element };
}

/**
 * Languages of a contest, as seen by the statement compiler
 * (`resolve-mdx-components` in `@olinfo/quizms-mdx`).
 */
export type ContestLanguages = {
  /** Absolute path of the contest entry (e.g. `/project/src/contest/contest.mdx`) */
  entry: string;
  /** Languages to build in this run; the first one is the default */
  languages: string[];
  /** Language of `question.md`: the first configured language */
  baseLanguage: string;
  /** Language codes allowed in `question.<lang>.md` file names */
  known: string[];
};

const envKey = "QUIZMS_CONTEST_LANGUAGES";

/**
 * Tells the statement compiler which languages to build for each contest.
 *
 * @param override Languages from the `--languages` command line option, replacing the
 *   configured ones.
 */
export function setContestLanguages(configs: VariantsConfig[], override?: string[]) {
  const value: ContestLanguages[] = configs.map((config) => ({
    entry: path.resolve(cwd(), "src", config.entry),
    languages: override ?? config.languages,
    baseLanguage: config.languages[0],
    known: [...new Set([...config.languages, ...(override ?? [])])],
  }));
  env[envKey] = JSON.stringify(value);
}

/** Returns the languages of the contest whose entry is `entry`, if known. */
export function getContestLanguages(entry: string): ContestLanguages | undefined {
  const value = env[envKey];
  if (!value) return;
  const contests = JSON.parse(value) as ContestLanguages[];
  return contests.find((contest) => contest.entry === path.resolve(entry));
}

/** Whether a variant must be written as one file per language. */
export function isMultilingual(config: VariantsConfig, override?: string[]) {
  return config.languages.length > 1 || override !== undefined;
}

/**
 * Returns the path of the first difference between two JSON values, or `undefined` if they
 * are deeply equal. Paths look like `["2.1"].options[3].correct`.
 */
export function firstDifference(a: unknown, b: unknown, at = ""): string | undefined {
  if (isEqual(a, b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = firstDifference(a[i], b[i], `${at}[${i}]`);
      if (diff !== undefined) return diff;
    }
    return at;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const key of keys) {
      const diff = firstDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${at}[${JSON.stringify(key)}]`,
      );
      if (diff !== undefined) return diff;
    }
  }
  return at || "(root)";
}
