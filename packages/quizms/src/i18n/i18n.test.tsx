// @vitest-environment happy-dom
import { Suspense } from "react";

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activateUiLocale,
  type CatalogLoader,
  getLoadedUiLocale,
  i18n,
  loadUiLocale,
  registerCatalog,
  resetUiLocalesForTests,
  resolveUiLocale,
} from "~/i18n";
import { UiLanguageProvider } from "~/web/components";

const catalogs: Record<string, Record<string, string>> = {
  en: { "test.hello": "Hello", "test.bye": "Bye" },
  it: { "test.hello": "Ciao", "test.bye": "Arrivederci" },
};

const testCatalog: CatalogLoader = (locale) => Promise.resolve({ messages: catalogs[locale] });

beforeEach(() => {
  resetUiLocalesForTests();
});

describe("resolveUiLocale", () => {
  it("keeps the languages with a catalog", () => {
    expect(resolveUiLocale("it")).toBe("it");
    expect(resolveUiLocale("en")).toBe("en");
  });

  it("uses English for languages without a catalog", () => {
    expect(resolveUiLocale("de")).toBe("en");
  });

  it("uses Italian when there is no language", () => {
    expect(resolveUiLocale(undefined)).toBe("it");
  });
});

describe("loadUiLocale", () => {
  it("loads every registered catalog", async () => {
    registerCatalog(testCatalog);
    registerCatalog(() => Promise.resolve({ messages: { "test.other": "Altro" } }));

    const instance = await loadUiLocale("it");
    expect(instance.locale).toBe("it");
    expect(instance._("test.hello")).toBe("Ciao");
    expect(instance._("test.other")).toBe("Altro");
  });

  it("caches the instance of each locale", async () => {
    const loader = vi.fn(testCatalog);
    registerCatalog(loader);

    expect(loadUiLocale("it")).toBe(loadUiLocale("it"));
    // `de` falls back to English, so it shares its instance.
    expect(await loadUiLocale("de")).toBe(await loadUiLocale("en"));
    expect(await loadUiLocale("it")).not.toBe(await loadUiLocale("en"));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("exposes an instance only once it is loaded", async () => {
    registerCatalog(testCatalog);
    const promise = loadUiLocale("en");
    expect(getLoadedUiLocale("en")).toBeUndefined();
    const loaded = await promise;
    expect(getLoadedUiLocale("en")).toBe(loaded);
  });

  it("adds catalogs registered after loading", async () => {
    const instance = await loadUiLocale("it");
    registerCatalog(testCatalog);
    await vi.waitFor(() => expect(instance._("test.hello")).toBe("Ciao"));
  });

  it("retries after a failure", async () => {
    let fail = true;
    registerCatalog((locale) =>
      fail ? Promise.reject(new Error("offline")) : testCatalog(locale),
    );

    await expect(loadUiLocale("it")).rejects.toThrow("offline");
    fail = false;
    expect((await loadUiLocale("it"))._("test.hello")).toBe("Ciao");
  });
});

describe("activateUiLocale", () => {
  it("sets the instance used by the `t` macro", async () => {
    registerCatalog(testCatalog);

    await activateUiLocale("it");
    expect(i18n.locale).toBe("it");
    expect(t({ id: "test.bye", message: "Bye" })).toBe("Arrivederci");

    await activateUiLocale("en");
    expect(t({ id: "test.bye", message: "Bye" })).toBe("Bye");
  });
});

describe("UiLanguageProvider", () => {
  function Page({ language }: { language: string }) {
    return (
      <Suspense fallback="loading">
        <UiLanguageProvider language={language}>
          <p>
            <Trans id="test.hello">Hello</Trans>
          </p>
        </UiLanguageProvider>
      </Suspense>
    );
  }

  it("renders the messages of the language", async () => {
    registerCatalog(testCatalog);

    // Awaiting `act` lets React retry the suspended render once the messages are loaded.
    const { rerender } = await act(() => render(<Page language="it" />));
    expect(screen.getByText("Ciao")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("it");

    await act(() => rerender(<Page language="de" />));
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("does not suspend for a language that is already loaded", async () => {
    registerCatalog(testCatalog);
    await loadUiLocale("it");

    render(<Page language="it" />);
    expect(screen.getByText("Ciao")).toBeInTheDocument();
  });
});
