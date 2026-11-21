import z from "zod";

import { languageCodeRegex } from "~/utils/languages";

/**
 * A text of the configuration that can be translated: the same text in every language, or a
 * table with the text in each language, e.g. `{ it = "Gara", en = "Contest" }`.
 */
export const localizedStringSchema = z.union([
  z.string(),
  z.record(z.string().regex(languageCodeRegex), z.string()),
]);

export type LocalizedString = z.infer<typeof localizedStringSchema>;

/**
 * Returns the text in `language`. Tables in parsed contests have every language of the contest,
 * the default one first, which is also used for any other language.
 */
export function localize(value: LocalizedString, language: string | undefined): string;
export function localize(
  value: LocalizedString | undefined,
  language: string | undefined,
): string | undefined;
export function localize(value: LocalizedString | undefined, language: string | undefined) {
  if (value === undefined || typeof value === "string") return value;
  return (language !== undefined && value[language]) || Object.values(value)[0] || "";
}

/**
 * Checks a table against the languages of the contest: it must have the default language and
 * no other language.
 */
export function localizedStringIssues(value: LocalizedString | undefined, languages: string[]) {
  if (value === undefined || typeof value === "string") return [];
  const issues: string[] = [];
  if (!(languages[0] in value)) {
    issues.push(`Missing the text in the default language \`${languages[0]}\`.`);
  }
  for (const language of Object.keys(value)) {
    if (!languages.includes(language)) {
      issues.push(`\`${language}\` is not a language of the contest (${languages.join(", ")}).`);
    }
  }
  return issues;
}

/**
 * Fills a table with every language of the contest (with the default text for the missing ones),
 * the default language first.
 */
export function completeLocalizedString<T extends LocalizedString | undefined>(
  value: T,
  languages: string[],
): T {
  if (value === undefined || typeof value === "string") return value;
  const defaultText = value[languages[0]] ?? Object.values(value)[0] ?? "";
  return Object.fromEntries(languages.map((lang) => [lang, value[lang] ?? defaultText])) as T;
}
