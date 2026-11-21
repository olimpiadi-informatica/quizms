import { type I18n, type Messages, setupI18n } from "@lingui/core";

import { resolveUiLocale, type UiLocale } from "./locales";

/** Loads the messages of a package in a locale, usually `import("../locales/<locale>.po")`. */
export type CatalogLoader = (locale: UiLocale) => Promise<{ messages: Messages }>;

const loaders: CatalogLoader[] = [];

type Entry = { i18n: I18n; ready: Promise<I18n>; loaded: boolean };
const entries = new Map<UiLocale, Entry>();

async function loadInto(i18n: I18n, locale: UiLocale, loader: CatalogLoader) {
  const { messages } = await loader(locale);
  i18n.load(locale, messages);
}

/**
 * Adds the message catalog of a package. Every package with UI strings calls this once, when
 * its entry module is imported.
 *
 * Locales that are already loaded also get the new catalog: their components re-render once it
 * is ready.
 */
export function registerCatalog(loader: CatalogLoader) {
  if (loaders.includes(loader)) return;
  loaders.push(loader);
  for (const [locale, entry] of entries) {
    loadInto(entry.i18n, locale, loader).catch((err) => {
      console.error(`Failed to load the ${locale} UI messages:`, err);
    });
  }
}

/**
 * Returns the Lingui instance of a language, with every registered catalog loaded.
 *
 * Each locale has its own instance, so different parts of the page (or a PDF) can use different
 * languages at the same time. The promise is cached: it can be passed to React's `use`.
 */
export function loadUiLocale(language: string | undefined): Promise<I18n> {
  const locale = resolveUiLocale(language);
  const cached = entries.get(locale);
  if (cached) return cached.ready;

  const i18n = setupI18n({ locale, messages: { [locale]: {} } });
  const entry: Entry = {
    i18n,
    loaded: false,
    ready: Promise.all(loaders.map((loader) => loadInto(i18n, locale, loader))).then(
      () => {
        entry.loaded = true;
        // Lets React's `use` read the value synchronously, without suspending again.
        Object.assign(entry.ready, { status: "fulfilled", value: i18n });
        return i18n;
      },
      (err) => {
        // Allow a retry, e.g. after a network error.
        entries.delete(locale);
        throw err;
      },
    ),
  };
  entries.set(locale, entry);
  return entry.ready;
}

/** Returns the Lingui instance of a language if it is already loaded, without waiting. */
export function getLoadedUiLocale(language: string | undefined): I18n | undefined {
  const entry = entries.get(resolveUiLocale(language));
  return entry?.loaded ? entry.i18n : undefined;
}

/**
 * Instance used by the `t` macro outside of React components, e.g. in the CLI.
 * Set it with `activateUiLocale`. React components use `useLingui` and `<Trans>` instead, which
 * follow the nearest `UiLanguageProvider` (in `@olinfo/quizms/components`).
 */
export let i18n: I18n = setupI18n();

/** Loads a language and makes it the one used by `i18n` (and the `t` macro). */
export async function activateUiLocale(language: string | undefined) {
  i18n = await loadUiLocale(language);
  return i18n;
}

/** Forgets the loaded catalogs and locales. Only for tests. */
export function resetUiLocalesForTests() {
  loaders.length = 0;
  entries.clear();
  i18n = setupI18n();
}
