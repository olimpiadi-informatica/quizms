/**
 * Languages with a UI message catalog. Keep in sync with `locales` in `lingui.config.ts`.
 *
 * English is the language of the source strings.
 */
export const uiLocales = ["en", "it"] as const;

export type UiLocale = (typeof uiLocales)[number];

/**
 * Returns the UI locale for a language of the contest.
 *
 * - No language (single-language contests): Italian, for backward compatibility.
 * - A language without a catalog: English.
 */
export function resolveUiLocale(language: string | undefined): UiLocale {
  if (!language) return "it";
  return (uiLocales as readonly string[]).includes(language) ? (language as UiLocale) : "en";
}
