/** A statement language code, e.g. `it` or `en`. */
export const languageCodeRegex = /^[a-z]{2}$/;

/**
 * Parses a comma-separated list of language codes (e.g. `"it,en"`).
 *
 * Throws if the list is empty, contains duplicates or a malformed code.
 */
export function parseLanguages(value: string): string[] {
  const languages = value.split(",").map((lang) => lang.trim());
  if (languages.length === 0 || languages.every((lang) => lang === "")) {
    throw new Error("The list of languages cannot be empty.");
  }
  for (const lang of languages) {
    if (!languageCodeRegex.test(lang)) {
      throw new Error(
        `Invalid language code \`${lang}\`: expected two lowercase letters (e.g. \`it\`).`,
      );
    }
  }
  const duplicate = languages.find((lang, i) => languages.indexOf(lang) !== i);
  if (duplicate) {
    throw new Error(`Duplicate language code \`${duplicate}\`.`);
  }
  return languages;
}

/**
 * Name of the statement file of a language, as published by `quizms variants`: contests with
 * more than one language have one file per language.
 */
export function contestStatementFile(
  languages: string[] | undefined,
  language: string,
  extension: "txt" | "pdf" = "txt",
): string {
  return (languages?.length ?? 0) > 1
    ? `statement.${language}.${extension}`
    : `statement.${extension}`;
}

/**
 * Languages of a set of contests, without duplicates, e.g. to choose the UI language on screens
 * that show several contests. Contests stored before `languages` existed are Italian.
 */
export function contestsLanguages(contests: { languages?: readonly string[] }[]): string[] {
  const languages = [...new Set(contests.flatMap((c) => c.languages ?? ["it"]))];
  return languages.length > 0 ? languages : ["it"];
}

/**
 * Returns the name of the translation of a file, e.g. `header.en.md` for `header.md`.
 */
export function localizedFileName(file: string, language: string): string {
  const match = /^(.*?)(\.[^./]+)?$/.exec(file)!;
  return `${match[1]}.${language}${match[2] ?? ""}`;
}
