import { type ReactNode, use, useEffect } from "react";

import { I18nProvider } from "@lingui/react";

import { getLoadedUiLocale, loadUiLocale } from "~/i18n";

/**
 * Renders its children with the UI in `language` (a language of the contest).
 *
 * The first time a language is used it suspends while its messages load: change the language in
 * a transition to keep showing the current UI meanwhile.
 */
export function UiLanguageProvider({
  language,
  children,
}: {
  language: string | undefined;
  children: ReactNode;
}) {
  // `use` can be called conditionally: only suspend when the language is not loaded yet.
  const i18n = getLoadedUiLocale(language) ?? use(loadUiLocale(language));

  useEffect(() => {
    document.documentElement.lang = i18n.locale;
  }, [i18n]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
UiLanguageProvider.displayName = "UiLanguageProvider";
