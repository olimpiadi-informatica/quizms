import type { ComponentType } from "react";

import { useStatementLanguageContext } from "~/web/student/language";

/**
 * Renders the translation of a component (e.g. a contest header) in the current statement
 * language, falling back to the default one.
 */
export function Localized({
  base,
  translations,
}: {
  /** Component in the default language */
  base: ComponentType;
  /** Components in the other languages, by language */
  translations: Record<string, ComponentType>;
}) {
  const language = useStatementLanguageContext();
  const Component = (language && translations[language]) || base;
  return <Component />;
}
Localized.displayName = "Localized";
