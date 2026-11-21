import {
  createContext,
  type ReactNode,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { I18nProvider } from "@lingui/react";

import { type I18n, loadUiLocale, setActiveUiLocale, uiLocales } from "~/i18n";

/** Depth of the enclosing `UiLanguageProvider`s. */
const DepthContext = createContext(0);
DepthContext.displayName = "UiLanguageDepthContext";

type Mounted = { depth: number; i18n: I18n };
const mounted = new Set<Mounted>();

/**
 * The page is in the language of the innermost mounted provider (effects run children first, so
 * the last one to run is not necessarily the right one).
 */
function applyPageLanguage() {
  let active: Mounted | undefined;
  for (const entry of mounted) {
    if (!active || entry.depth >= active.depth) active = entry;
  }
  if (!active) return;
  document.documentElement.lang = active.i18n.locale;
  setActiveUiLocale(active.i18n);
}

/**
 * Renders its children with the UI in `language` (a language of the contest).
 *
 * The first time a language is used it suspends while its messages load: change the language in
 * a transition to keep showing the current UI meanwhile.
 *
 * The innermost provider also sets the language of the page (`<html lang>`) and of the `t` macro
 * used outside React.
 */
export function UiLanguageProvider({
  language,
  children,
}: {
  language: string | undefined;
  children: ReactNode;
}) {
  // Suspends only the first time: the cached promise is then marked as fulfilled.
  const i18n = use(loadUiLocale(language));
  const depth = use(DepthContext) + 1;

  useEffect(() => {
    const entry = { depth, i18n };
    mounted.add(entry);
    applyPageLanguage();
    return () => {
      mounted.delete(entry);
      applyPageLanguage();
    };
  }, [depth, i18n]);

  return (
    <DepthContext.Provider value={depth}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </DepthContext.Provider>
  );
}
UiLanguageProvider.displayName = "UiLanguageProvider";

const storageKey = "quizms_ui_language";

function readStoredLanguage() {
  try {
    return localStorage.getItem(storageKey) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeLanguage(language: string) {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Private mode or blocked storage: the choice only lasts until the page is reloaded.
  }
}

type Preference = {
  /** Language chosen by the user, if any */
  preferred: string | undefined;
  /** Saves the language chosen by the user */
  setPreferred: (language: string) => void;
};

const UiLanguagePreferenceContext = createContext<Preference>({
  preferred: undefined,
  setPreferred: () => {},
});
UiLanguagePreferenceContext.displayName = "UiLanguagePreferenceContext";

/** The language chosen by the user, shared by every screen of the app. */
export function useUiLanguagePreference() {
  return use(UiLanguagePreferenceContext);
}

/**
 * Root of the UI language of an app (see `createApp`).
 *
 * It keeps the language chosen by the user (from `?lang=` or a previous visit, then saved in the
 * browser) and shows the UI in it, or in Italian, until a `UiLanguageScope` knows the languages
 * of the contests.
 */
export function UiLanguageRoot({ children }: { children: ReactNode }) {
  const [preferred, setPreferredState] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    return fromUrl ?? readStoredLanguage();
  });

  const setPreferred = useCallback((language: string) => {
    storeLanguage(language);
    // In a transition, so the current UI stays visible while the new messages load.
    startTransition(() => setPreferredState(language));
  }, []);

  const preference = useMemo(() => ({ preferred, setPreferred }), [preferred, setPreferred]);
  const language =
    preferred && (uiLocales as readonly string[]).includes(preferred) ? preferred : "it";

  return (
    <UiLanguagePreferenceContext.Provider value={preference}>
      <UiLanguageProvider language={language}>{children}</UiLanguageProvider>
    </UiLanguagePreferenceContext.Provider>
  );
}
UiLanguageRoot.displayName = "UiLanguageRoot";

/**
 * Chooses the UI language among `languages`: the one chosen by the user, else the first one
 * the browser asks for, else the first of `languages`.
 */
export function pickUiLanguage(
  languages: readonly string[],
  preferred: string | undefined,
  browserLanguages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages,
): string {
  if (preferred && languages.includes(preferred)) return preferred;
  for (const browserLanguage of browserLanguages) {
    // `en-US` -> `en`
    const code = browserLanguage.split("-")[0].toLowerCase();
    if (languages.includes(code)) return code;
  }
  return languages[0] ?? "it";
}

type UiLanguage = {
  /** Current UI language */
  language: string;
  /** Languages the user can choose */
  languages: readonly string[];
  /** Changes the UI language and remembers the choice */
  setLanguage: (language: string) => void;
};

const UiLanguageContext = createContext<UiLanguage | undefined>(undefined);
UiLanguageContext.displayName = "UiLanguageContext";

/** The UI language of the nearest `UiLanguageScope`, if any. */
export function useUiLanguage() {
  return use(UiLanguageContext);
}

/**
 * Shows the UI in one of `languages`, e.g. the languages of the contests available on a screen
 * (see `contestsLanguages`). Use `UiLanguageSelect` to let the user choose.
 */
export function UiLanguageScope({
  languages,
  children,
}: {
  languages: readonly string[];
  children: ReactNode;
}) {
  const { preferred, setPreferred } = useUiLanguagePreference();
  const language = pickUiLanguage(languages, preferred);

  const value = useMemo(
    () => ({ language, languages, setLanguage: setPreferred }),
    [language, languages, setPreferred],
  );

  return (
    <UiLanguageContext.Provider value={value}>
      <UiLanguageProvider language={language}>{children}</UiLanguageProvider>
    </UiLanguageContext.Provider>
  );
}
UiLanguageScope.displayName = "UiLanguageScope";

/** Drop-down to choose a language, shown only when there is more than one. */
export function LanguageSelect({
  languages,
  value,
  onChange,
}: {
  languages: readonly string[];
  value: string;
  onChange: (language: string) => void;
}) {
  if (languages.length < 2) return null;
  return (
    <select
      className="select select-sm select-ghost"
      aria-label="Lingua / Language"
      value={value}
      onChange={(e) => onChange(e.target.value)}>
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
LanguageSelect.displayName = "LanguageSelect";

/** Language drop-down of the nearest `UiLanguageScope`. */
export function UiLanguageSelect() {
  const uiLanguage = useUiLanguage();
  if (!uiLanguage) return null;
  return (
    <LanguageSelect
      languages={uiLanguage.languages}
      value={uiLanguage.language}
      onChange={uiLanguage.setLanguage}
    />
  );
}
UiLanguageSelect.displayName = "UiLanguageSelect";
