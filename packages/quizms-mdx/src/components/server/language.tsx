import type { ReactNode } from "react";

/**
 * Language of the statement being rendered. React Server Components can't read context,
 * so the language is passed by `quizms variants` through the environment.
 */
export function useStatementLanguage(): string | undefined {
  return process.env.QUIZMS_LANGUAGE || undefined;
}

/** Renders its children only when the statement is in language `lang`. */
export function Locale({ lang, children }: { lang: string; children: ReactNode }) {
  return useStatementLanguage() === lang ? children : null;
}
Locale.displayName = "Locale";
