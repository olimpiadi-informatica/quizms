// @vitest-environment happy-dom
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Localized } from "~/web/components/localized";

import {
  StatementLanguageContext,
  useStatementLanguageContext,
  useStatementLanguageState,
} from "./language";

const contest = { languages: ["it", "en", "fr"] as [string, ...string[]] };

function setUrl(search: string) {
  window.history.replaceState(null, "", `/contest${search}`);
}

describe("useStatementLanguageState", () => {
  beforeEach(() => setUrl(""));
  afterEach(() => setUrl(""));

  it("defaults to the first contest language", () => {
    const { result } = renderHook(() => useStatementLanguageState(contest));
    expect(result.current[0]).toBe("it");
  });

  it("defaults to Italian for contests stored without languages", () => {
    const { result } = renderHook(() => useStatementLanguageState({} as typeof contest));
    expect(result.current[0]).toBe("it");
  });

  it("uses the saved language over the default", () => {
    const { result } = renderHook(() => useStatementLanguageState(contest, "en"));
    expect(result.current[0]).toBe("en");
  });

  it("uses the URL parameter over the saved language", () => {
    setUrl("?lang=fr");
    const { result } = renderHook(() => useStatementLanguageState(contest, "en"));
    expect(result.current[0]).toBe("fr");
  });

  it("ignores languages the contest does not have", () => {
    setUrl("?lang=de");
    const { result } = renderHook(() => useStatementLanguageState(contest, "es"));
    expect(result.current[0]).toBe("it");
  });

  it("changes language, updates the URL and saves the choice", async () => {
    setUrl("?v=7");
    const save = vi.fn();
    const { result } = renderHook(() => useStatementLanguageState(contest, undefined, save));

    act(() => result.current[1]("en"));

    expect(result.current[0]).toBe("en");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("lang")).toBe("en");
    expect(params.get("v")).toBe("7");
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith("en"));
  });

  it("does not save a language equal to the saved one", async () => {
    const save = vi.fn();
    const { result } = renderHook(() => useStatementLanguageState(contest, "en", save));

    act(() => result.current[1]("fr"));
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith("fr"));

    save.mockClear();
    act(() => result.current[1]("en"));
    expect(result.current[0]).toBe("en");
    // Wait for effects to flush before asserting that nothing was saved.
    await act(() => Promise.resolve());
    expect(save).not.toHaveBeenCalled();
  });

  it("logs a warning when saving fails, keeping the new language", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useStatementLanguageState(contest, undefined, save));

    act(() => result.current[1]("fr"));

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(warn.mock.calls[0][0]).toMatch(/Failed to save the statement language/);
    expect(result.current[0]).toBe("fr");
    warn.mockRestore();
  });
});

describe("Localized", () => {
  const Base = () => <p>Benvenuti</p>;
  const translations = { en: () => <p>Welcome</p> };

  it("renders the base component without a language", () => {
    render(<Localized base={Base} translations={translations} />);
    expect(screen.getByText("Benvenuti")).toBeInTheDocument();
  });

  it("renders the translation for the current language", () => {
    render(
      <StatementLanguageContext.Provider value="en">
        <Localized base={Base} translations={translations} />
      </StatementLanguageContext.Provider>,
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.queryByText("Benvenuti")).not.toBeInTheDocument();
  });

  it("falls back to the base component for a missing translation", () => {
    render(
      <StatementLanguageContext.Provider value="fr">
        <Localized base={Base} translations={translations} />
      </StatementLanguageContext.Provider>,
    );
    expect(screen.getByText("Benvenuti")).toBeInTheDocument();
  });
});

describe("useStatementLanguageContext", () => {
  it("is undefined outside a provider (single-language contest)", () => {
    const { result } = renderHook(() => useStatementLanguageContext());
    expect(result.current).toBeUndefined();
  });
});
