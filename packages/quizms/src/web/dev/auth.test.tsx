// @vitest-environment happy-dom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Contest } from "~/models";
import { useStudent } from "~/web/student/context";
import { useStatementLanguageContext } from "~/web/student/language";

import { makeContest, TestShell, waitForSuspense } from "../test-utils";
import { DevProvider } from "./auth";

/** Minimal stand-in for a statement: a problem that can be answered, and the statement language. */
function FakeStatement() {
  const { setAnswer, student } = useStudent();
  const language = useStatementLanguageContext();
  return (
    <div>
      <p>Lingua del testo: {language}</p>
      <p>Risposta: {(student.answers?.["1"]?.value as string) ?? "nessuna"}</p>
      <button type="button" onClick={() => setAnswer("1", { type: "multipleChoice", value: "B" })}>
        Rispondi B
      </button>
    </div>
  );
}

async function renderDev(contest: Contest) {
  await act(() =>
    render(
      <TestShell>
        <DevProvider contest={contest}>
          <FakeStatement />
        </DevProvider>
      </TestShell>,
    ),
  );
  await waitForSuspense();
}

describe("DevProvider", () => {
  beforeEach(() => window.history.replaceState(null, "", "/demo"));
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("provides an anonymous student whose answers are kept in memory", async () => {
    const user = userEvent.setup();
    await renderDev(makeContest());

    expect(screen.getByText(/Utente\s+anonimo/)).toBeInTheDocument();
    expect(screen.getByText("Risposta: nessuna")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rispondi B" }));

    expect(screen.getByText("Risposta: B")).toBeInTheDocument();
    // 1 of the 4 problems answered
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("switches the statement language from the navbar", async () => {
    const user = userEvent.setup();
    await renderDev(makeContest({ languages: ["it", "en"] }));

    expect(screen.getByText("Lingua del testo: it")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Lingua / Language" }), "en");

    await waitFor(() => expect(screen.getByText("Lingua del testo: en")).toBeInTheDocument());
    expect(new URLSearchParams(window.location.search).get("lang")).toBe("en");
  });

  it("opens in the language of the URL", async () => {
    window.history.replaceState(null, "", "/demo?lang=en");
    await renderDev(makeContest({ languages: ["it", "en"] }));
    expect(screen.getByText("Lingua del testo: en")).toBeInTheDocument();
  });
});
