// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLingui } from "~/i18n";
import { contestsLanguages } from "~/utils";
import { makeContest, renderInStudentProvider } from "~/web/test-utils";

import {
  pickUiLanguage,
  UiLanguageRoot,
  UiLanguageScope,
  UiLanguageSelect,
} from "./ui-language-provider";

/** Shows the active UI locale. */
function Locale() {
  const { i18n } = useLingui();
  return <p>locale: {i18n.locale}</p>;
}

function setUrl(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

beforeEach(() => {
  setUrl("");
  localStorage.clear();
});

afterEach(() => {
  setUrl("");
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("pickUiLanguage", () => {
  it("uses the language chosen by the user", () => {
    expect(pickUiLanguage(["it", "en"], "en", ["it"])).toBe("en");
  });

  it("ignores a chosen language that is not available", () => {
    expect(pickUiLanguage(["it", "en"], "fr", [])).toBe("it");
  });

  it("uses the first available language the browser asks for", () => {
    expect(pickUiLanguage(["it", "en"], undefined, ["de-DE", "en-US", "it"])).toBe("en");
  });

  it("falls back to the first language", () => {
    expect(pickUiLanguage(["en", "it"], undefined, ["fr"])).toBe("en");
    expect(pickUiLanguage([], undefined, [])).toBe("it");
  });
});

describe("contestsLanguages", () => {
  it("merges the languages of the contests", () => {
    const contests = [
      makeContest({ languages: ["it", "en"] }),
      makeContest({ languages: ["en", "fr"] }),
    ];
    expect(contestsLanguages(contests)).toEqual(["it", "en", "fr"]);
  });

  it("treats contests without languages as Italian", () => {
    expect(contestsLanguages([{}])).toEqual(["it"]);
    expect(contestsLanguages([])).toEqual(["it"]);
  });
});

describe("UiLanguageRoot", () => {
  it("is in Italian by default", async () => {
    await act(() => render(<UiLanguageRoot>{<Locale />}</UiLanguageRoot>));
    expect(screen.getByText("locale: it")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("it");
  });

  it("uses the language of the URL", async () => {
    setUrl("?lang=en");
    await act(() => render(<UiLanguageRoot>{<Locale />}</UiLanguageRoot>));
    expect(screen.getByText("locale: en")).toBeInTheDocument();
  });

  it("uses the language saved on a previous visit", async () => {
    localStorage.setItem("quizms_ui_language", "en");
    await act(() => render(<UiLanguageRoot>{<Locale />}</UiLanguageRoot>));
    expect(screen.getByText("locale: en")).toBeInTheDocument();
  });
});

describe("UiLanguageScope", () => {
  async function renderScope(languages: string[]) {
    await act(() =>
      render(
        <UiLanguageRoot>
          <UiLanguageScope languages={languages}>
            <UiLanguageSelect />
            <Locale />
          </UiLanguageScope>
        </UiLanguageRoot>,
      ),
    );
  }

  it("offers the given languages and remembers the choice", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["it-IT"]);
    const user = userEvent.setup();
    await renderScope(["it", "en"]);

    const select = screen.getByRole("combobox", { name: "Lingua / Language" });
    expect([...select.querySelectorAll("option")].map((o) => o.value)).toEqual(["it", "en"]);
    expect(screen.getByText("locale: it")).toBeInTheDocument();

    await user.selectOptions(select, "en");

    expect(screen.getByText("locale: en")).toBeInTheDocument();
    expect(localStorage.getItem("quizms_ui_language")).toBe("en");
  });

  it("hides the selector with a single language", async () => {
    await renderScope(["en"]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("locale: en")).toBeInTheDocument();
  });

  it("falls back to English for a language without messages", async () => {
    await renderScope(["de"]);
    expect(screen.getByText("locale: en")).toBeInTheDocument();
  });
});

describe("StudentProvider", () => {
  it("shows the UI in the statement language", async () => {
    await renderInStudentProvider(<Locale />, {
      contest: makeContest({ languages: ["it", "en"] }),
      language: "en",
    });
    expect(screen.getByText("locale: en")).toBeInTheDocument();
  });
});
