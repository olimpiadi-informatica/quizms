import type { ReactNode } from "react";

/** Language of the statement being rendered, passed by `quizms variants`. */
export function useStatementLanguage(): string | undefined {
  return process.env.QUIZMS_LANGUAGE || undefined;
}

export function StatementLanguageProvider({
  children,
}: {
  language?: string;
  children: ReactNode;
}) {
  return children;
}

export function Locale({ lang, children }: { lang: string; children: ReactNode }) {
  return useStatementLanguage() === lang ? children : null;
}
