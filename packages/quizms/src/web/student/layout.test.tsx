// @vitest-environment happy-dom
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeContest,
  makeStudent,
  makeVenue,
  renderInStudentProvider,
  schema,
} from "../test-utils";

const hour = 3_600_000;
const ongoing = () => ({ start: new Date(Date.now() - hour), end: new Date(Date.now() + hour) });
const ended = () => ({ start: new Date(Date.now() - 2 * hour), end: new Date(Date.now() - hour) });

const renderLayout = renderInStudentProvider;

/** The modals have a title heading but no accessible name: find them through the heading. */
function getDialog(title: string) {
  const dialog = screen.getByRole("heading", { name: title, hidden: true }).closest("dialog");
  expect(dialog).not.toBeNull();
  return dialog!;
}

function progressText() {
  return screen.getByText(/^\d+%$/).textContent;
}

describe("StudentLayout", () => {
  beforeEach(() => {
    // happy-dom resets `returnValue` on `dialog.close()`; per spec it is kept when no value is
    // passed, and the layout relies on that to tell a confirmed submission from a cancelled one.
    const close = HTMLDialogElement.prototype.close;
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      close.call(this, returnValue ?? this.returnValue);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete (document as { fullscreenElement?: Element }).fullscreenElement;
  });

  it("renders the contest title, the student name and the statement", async () => {
    await renderLayout(<p>Testo della prova</p>);
    expect(screen.getByRole("heading", { level: 1, name: "Gara di prova" })).toBeInTheDocument();
    expect(screen.getByText(/Ada\s+Lovelace/)).toBeInTheDocument();
    expect(screen.getByText("Testo della prova")).toBeInTheDocument();
  });

  describe("progress", () => {
    it("counts answered problems over the contest problems", async () => {
      await renderLayout(null, {
        student: makeStudent({
          answers: {
            "1": { type: "multipleChoice", value: "A" },
            "2": { type: "multipleResponse", value: undefined },
            "3": { type: "openText", value: "x" },
          },
        }),
      });
      // 2 of 4 problems answered (an answer without a value is blank)
      expect(progressText()).toBe("50%");
    });

    it("uses the schema size when it is known", async () => {
      await renderLayout(null, {
        contest: makeContest({ problemIds: ["1", "2"] }),
        schema,
        student: makeStudent({ answers: { "1": { type: "multipleChoice", value: "A" } } }),
      });
      expect(progressText()).toBe("25%");
    });

    it("shows 0% for a contest without problems", async () => {
      await renderLayout(null, { contest: makeContest({ problemIds: [] }) });
      expect(progressText()).toBe("0%");
    });
  });

  describe("language selector", () => {
    const contest = makeContest({ languages: ["it", "en"] });

    it("is shown for multilingual contests and changes the language", async () => {
      const setLanguage = vi.fn();
      await renderLayout(null, { contest, language: "it", setLanguage });

      const select = screen.getByRole("combobox", { name: "Lingua / Language" });
      expect(select).toHaveValue("it");
      expect(
        within(select)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["IT", "EN"]);

      await userEvent.selectOptions(select, "en");
      expect(setLanguage).toHaveBeenCalledExactlyOnceWith("en");
    });

    it("reflects the current language", async () => {
      await renderLayout(null, { contest, language: "en", setLanguage: () => {} });
      expect(screen.getByRole("combobox", { name: "Lingua / Language" })).toHaveValue("en");
    });

    it("is hidden for single-language contests", async () => {
      await renderLayout(null, { setLanguage: () => {} });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("is hidden when the language cannot be changed", async () => {
      await renderLayout(null, { contest });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("ongoing contest", () => {
    it("shows the 00:00 placeholder before the participation window is set", async () => {
      await renderLayout(null);
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("shows a countdown during the participation window", async () => {
      await renderLayout(null, { student: makeStudent({ participationWindow: ongoing() }) });
      expect(screen.queryByText("00:00")).not.toBeInTheDocument();
      expect(document.querySelector(".countdown")).toBeInTheDocument();
    });

    it("asks for confirmation, then submits and shows the result", async () => {
      const user = userEvent.setup();
      const submit = vi.fn();
      await renderLayout(null, {
        schema,
        submit,
        student: makeStudent({ participationWindow: ongoing(), score: 7 }),
        venue: makeVenue({ participationWindow: ongoing() }),
      });

      const confirmDialog = getDialog("Confermi di voler terminare?");
      const completed = getDialog("Prova terminata");
      expect(confirmDialog).not.toHaveAttribute("open");

      await user.click(screen.getByRole("button", { name: "Termina" }));
      expect(confirmDialog).toHaveAttribute("open");

      await user.click(within(confirmDialog).getByRole("button", { name: "Conferma" }));
      expect(submit).toHaveBeenCalledOnce();

      await waitFor(() => expect(completed).toHaveAttribute("open"));
      expect(confirmDialog).not.toHaveAttribute("open");
      expect(within(completed).getByText(/Hai ottenuto un punteggio di/)).toHaveTextContent(
        "Hai ottenuto un punteggio di 7 su 20.",
      );
    });

    it("does not submit when the confirmation is cancelled", async () => {
      const user = userEvent.setup();
      const submit = vi.fn();
      await renderLayout(null, {
        submit,
        student: makeStudent({ participationWindow: ongoing() }),
      });

      await user.click(screen.getByRole("button", { name: "Termina" }));
      const confirmDialog = getDialog("Confermi di voler terminare?");
      await user.click(within(confirmDialog).getByRole("button", { name: "Annulla" }));

      expect(submit).not.toHaveBeenCalled();
      expect(confirmDialog).not.toHaveAttribute("open");
      // Give the layout a chance to (wrongly) open the result modal.
      await act(() => Promise.resolve());
      expect(getDialog("Prova terminata")).not.toHaveAttribute("open");
    });

    it("logs out from the user menu", async () => {
      const user = userEvent.setup();
      const logout = vi.fn();
      await renderLayout(null, { logout });
      await user.click(screen.getByRole("button", { name: /Esci/ }));
      expect(logout).toHaveBeenCalledOnce();
    });
  });

  describe("terminated contest", () => {
    it("disables submission when the contest cannot be restarted", async () => {
      await renderLayout(null, { student: makeStudent({ participationWindow: ended() }) });
      expect(screen.getByRole("button", { name: "Termina" })).toBeDisabled();
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("offers results and restart when the contest can be restarted", async () => {
      const user = userEvent.setup();
      const reset = vi.fn();
      await renderLayout(null, {
        reset,
        schema,
        student: makeStudent({ participationWindow: ended(), score: 3 }),
      });

      expect(screen.queryByRole("button", { name: "Termina" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Mostra risultati" }));
      const completed = getDialog("Prova terminata");
      expect(completed).toHaveAttribute("open");
      expect(within(completed).getByText(/Hai ottenuto/)).toHaveTextContent(
        "Hai ottenuto un punteggio di 3 su 20.",
      );

      await user.click(screen.getByRole("button", { name: "Ricomincia" }));
      expect(reset).toHaveBeenCalledOnce();
    });

    it("hides the results button without a schema", async () => {
      await renderLayout(null, {
        reset: () => {},
        student: makeStudent({ participationWindow: ended() }),
      });
      expect(screen.queryByRole("button", { name: "Mostra risultati" })).toBeNull();
      expect(screen.getByRole("button", { name: "Ricomincia" })).toBeInTheDocument();
    });

    it("icon-only buttons have an accessible name", async () => {
      await renderLayout(null, {
        reset: () => {},
        schema,
        student: makeStudent({ participationWindow: ended() }),
      });
      expect(screen.getByRole("button", { name: "Mostra risultati" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ricomincia" })).toBeInTheDocument();
    });
  });

  describe("fullscreen enforcement", () => {
    it("warns when the page loses focus and logs out after the grace period", async () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      const logout = vi.fn();
      // Last activity 11 seconds ago: the 10.5 seconds grace period is already over.
      localStorage.setItem("quizms_last_active_uid-1", new Date(Date.now() - 11_000).toISOString());

      await renderLayout(null, {
        enforceFullscreen: true,
        logout,
        student: makeStudent({ participationWindow: ongoing() }),
      });

      expect(await screen.findByRole("heading", { name: "Attenzione!" })).toBeInTheDocument();
      await waitFor(() => expect(logout).toHaveBeenCalled());
    });

    it("records activity while the page is focused and in fullscreen", async () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      // happy-dom does not implement the Fullscreen API
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => document.body,
      });
      const logout = vi.fn();

      await renderLayout(null, {
        enforceFullscreen: true,
        logout,
        student: makeStudent({ participationWindow: ongoing() }),
      });

      await waitFor(() => expect(localStorage.getItem("quizms_last_active_uid-1")).not.toBeNull());
      expect(screen.queryByRole("heading", { name: "Attenzione!" })).not.toBeInTheDocument();
      expect(logout).not.toHaveBeenCalled();
    });

    it("is not enforced after the contest has ended", async () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      await renderLayout(null, {
        enforceFullscreen: true,
        student: makeStudent({ participationWindow: ended() }),
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.queryByRole("heading", { name: "Attenzione!" })).not.toBeInTheDocument();
    });
  });
});
