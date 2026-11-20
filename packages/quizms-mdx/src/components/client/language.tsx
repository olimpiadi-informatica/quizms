"use client";

import type { ReactNode } from "react";

import { StatementLanguageContext, useStatementLanguageContext } from "@olinfo/quizms/student";

/** Sets the language of the statement rendered inside it. */
export function StatementLanguageProvider({
  language,
  children,
}: {
  language?: string;
  children: ReactNode;
}) {
  return (
    <StatementLanguageContext.Provider value={language}>
      {children}
    </StatementLanguageContext.Provider>
  );
}
StatementLanguageProvider.displayName = "StatementLanguageProvider";

/** Language of the statement being rendered (`undefined` in single-language contests). */
export function useStatementLanguage(): string | undefined {
  return useStatementLanguageContext();
}

/** Renders its children only when the statement is in language `lang`. */
export function Locale({ lang, children }: { lang: string; children: ReactNode }) {
  return useStatementLanguage() === lang ? children : null;
}
Locale.displayName = "Locale";
