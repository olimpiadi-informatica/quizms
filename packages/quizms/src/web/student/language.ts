import { createContext, startTransition, use, useCallback, useState } from "react";

import type { Contest } from "~/models";

/**
 * Language of the statement currently being rendered.
 *
 * Provided by the host app (dev, print, student) and, inside RSC statements, by the
 * statement itself (see `StatementLanguageProvider` in `@olinfo/quizms-mdx`).
 * `undefined` means single-language contest.
 */
export const StatementLanguageContext = createContext<string | undefined>(undefined);
StatementLanguageContext.displayName = "StatementLanguageContext";

export function useStatementLanguageContext() {
  return use(StatementLanguageContext);
}

function languageFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("lang");
}

/**
 * Statement language chosen by the student, for the `language` / `setLanguage` props of
 * `StudentProvider`.
 *
 * The language is, in order: the `?lang=` URL parameter, the saved choice (`saved`), the
 * contest default. Changing it updates the URL, calls `save` (e.g. to store it on the student)
 * and happens in a transition, so the current statement stays visible while the new one loads.
 */
export function useStatementLanguageState(
  contest: Pick<Contest, "languages">,
  saved?: string,
  save?: (language: string) => Promise<void> | void,
): [string, (language: string) => void] {
  // Contests stored before `languages` existed don't have the field
  const languages = contest.languages ?? ["it"];
  const valid = (lang: string | null | undefined) =>
    lang && languages.includes(lang) ? lang : undefined;

  const [selected, setSelected] = useState(() => valid(languageFromUrl()));
  const language = selected ?? valid(saved) ?? languages[0];

  const setLanguage = useCallback(
    (lang: string) => {
      startTransition(() => setSelected(lang));

      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState(window.history.state, "", url);

      Promise.resolve(save?.(lang)).catch((err) => {
        console.warn("Failed to save the statement language:", err);
      });
    },
    [save],
  );

  return [language, setLanguage];
}
