// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { saveAs } from "file-saver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Announcement, Contest, StudentRestore, Venue } from "~/models";
import { UiLanguageProvider } from "~/web/components/ui-language-provider";

import { makeContest, makeVenue } from "../test-utils";
import { TeacherContext, type TeacherContextProps } from "./context";
import TeacherDashboard from "./dashboard";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

const minute = 60_000;
const hour = 60 * minute;

type Overrides = {
  contest?: Partial<Contest>;
  venue?: Partial<Venue>;
  announcements?: Announcement[];
  restores?: StudentRestore[];
} & Partial<
  Pick<
    TeacherContextProps,
    "startContestWindow" | "stopContestWindow" | "getPdfStatements" | "finalizeVenue"
  >
>;

function makeTeacherContext({
  contest: contestOverrides,
  venue: venueOverrides,
  announcements = [],
  restores = [],
  ...props
}: Overrides = {}) {
  const contest = makeContest(contestOverrides);
  const venue = makeVenue({ token: "TOKEN42", ...venueOverrides });
  const approve = vi.fn();
  const reject = vi.fn();
  const value: TeacherContextProps = {
    contests: [contest],
    contest,
    venues: [venue],
    venue,
    variants: {},
    startContestWindow: vi.fn(),
    stopContestWindow: vi.fn(),
    finalizeVenue: vi.fn(),
    logout: vi.fn(),
    getPdfStatements: vi.fn().mockResolvedValue({}),
    useAnnouncements: () => announcements,
    useStudents: () => [[], vi.fn()] as const,
    useStudentRestores: () => [restores, approve, reject] as const,
    ...props,
  };
  return { value, approve, reject };
}

function renderDashboard(overrides: Overrides = {}) {
  const ctx = makeTeacherContext(overrides);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <UiLanguageProvider language="it">
      <TeacherContext.Provider value={ctx.value}>{children}</TeacherContext.Provider>
    </UiLanguageProvider>
  );
  render(<TeacherDashboard />, { wrapper: Wrapper });
  return ctx;
}

const onlineSettings = (allowRestart = false): Contest["onlineSettings"] => ({
  contestWindow: { start: new Date(Date.now() - 24 * hour), end: new Date(Date.now() + 24 * hour) },
  duration: 60,
  allowRestart,
});

function getDialog(title: string) {
  return screen.getByRole("heading", { name: title, hidden: true }).closest("dialog")!;
}

describe("TeacherDashboard", () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
  });

  describe("announcements", () => {
    it("shows a placeholder without announcements", () => {
      renderDashboard();
      expect(screen.getByText("Nessuna comunicazione.")).toBeInTheDocument();
    });

    it("renders title and markdown body of each announcement", () => {
      renderDashboard({
        announcements: [
          {
            id: "a1",
            contestIds: ["demo"],
            createdAt: new Date("2026-03-01T09:00:00Z"),
            level: "warning",
            title: "Manutenzione",
            body: "La piattaforma sarà **offline** stasera.",
          },
        ],
      });
      expect(screen.getByRole("heading", { name: "Manutenzione" })).toBeInTheDocument();
      expect(screen.getByText("offline").tagName).toBe("STRONG");
      expect(screen.queryByText("Nessuna comunicazione.")).not.toBeInTheDocument();
    });
  });

  it("renders the contest instructions as markdown", () => {
    renderDashboard({ contest: { instructions: "Leggi il [regolamento](https://example.org)." } });
    expect(screen.getByRole("link", { name: "regolamento" })).toHaveAttribute(
      "href",
      "https://example.org",
    );
  });

  describe("online contest management", () => {
    it("has no online controls for offline-only contests", () => {
      renderDashboard();
      expect(screen.queryByRole("button", { name: "Inizia prova online" })).not.toBeInTheDocument();
      expect(screen.queryByText("Richieste di accesso")).not.toBeInTheDocument();
    });

    it("starts the contest after confirmation", async () => {
      const user = userEvent.setup();
      const startContestWindow = vi.fn().mockResolvedValue(undefined);
      renderDashboard({ contest: { onlineSettings: onlineSettings() }, startContestWindow });

      expect(screen.getByText("La gara non è ancora iniziata!")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Inizia prova online" }));
      const dialog = getDialog("Conferma");
      expect(dialog).toHaveAttribute("open");

      await user.click(within(dialog).getByRole("button", { name: "Conferma" }));
      expect(startContestWindow).toHaveBeenCalledExactlyOnceWith("venue-1");
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    });

    it("does not start the contest when cancelled", async () => {
      const user = userEvent.setup();
      const startContestWindow = vi.fn();
      renderDashboard({ contest: { onlineSettings: onlineSettings() }, startContestWindow });

      await user.click(screen.getByRole("button", { name: "Inizia prova online" }));
      await user.click(within(getDialog("Conferma")).getByRole("button", { name: "Annulla" }));
      expect(startContestWindow).not.toHaveBeenCalled();
    });

    it("cannot be started outside the contest window", () => {
      renderDashboard({
        contest: {
          onlineSettings: {
            ...onlineSettings()!,
            contestWindow: {
              start: new Date(Date.now() + hour),
              end: new Date(Date.now() + 2 * hour),
            },
          },
        },
      });
      expect(screen.queryByRole("button", { name: "Inizia prova online" })).not.toBeInTheDocument();
    });

    it("shows the code and allows cancelling before the start", async () => {
      const user = userEvent.setup();
      const stopContestWindow = vi.fn().mockResolvedValue(undefined);
      renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        venue: {
          participationWindow: {
            start: new Date(Date.now() + 5 * minute),
            end: new Date(Date.now() + 65 * minute),
          },
        },
        stopContestWindow,
      });

      expect(screen.getByText("TOKEN42")).toBeInTheDocument();
      expect(screen.getByText(/Tempo rimanente all'inizio/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Inizia prova online" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Annulla inizio gara" }));
      await user.click(within(getDialog("Conferma")).getByRole("button", { name: "Conferma" }));
      expect(stopContestWindow).toHaveBeenCalledExactlyOnceWith("venue-1");
    });

    it("does not allow cancelling less than a minute before the start", () => {
      renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        venue: {
          participationWindow: {
            start: new Date(Date.now() + 30_000),
            end: new Date(Date.now() + hour),
          },
        },
      });
      expect(screen.getByText(/Tempo rimanente all'inizio/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Annulla inizio gara" })).not.toBeInTheDocument();
    });

    it("shows the remaining time during the contest", () => {
      renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        venue: {
          participationWindow: {
            start: new Date(Date.now() - 10 * minute),
            end: new Date(Date.now() + 50 * minute),
          },
        },
      });
      expect(screen.getByText("TOKEN42")).toBeInTheDocument();
      expect(screen.getByText(/^Tempo rimanente:/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Annulla inizio gara" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Inizia prova online" })).not.toBeInTheDocument();
    });

    it.each([
      [false, false],
      [true, true],
    ])("after the end, with allowRestart=%s, can restart: %s", (allowRestart, canRestart) => {
      renderDashboard({
        contest: { onlineSettings: onlineSettings(allowRestart) },
        venue: {
          participationWindow: {
            start: new Date(Date.now() - 2 * hour),
            end: new Date(Date.now() - hour),
          },
        },
      });
      expect(screen.getByText("La gara è terminata.")).toBeInTheDocument();
      expect(!!screen.queryByRole("button", { name: "Inizia prova online" })).toBe(canRestart);
    });
  });

  describe("access requests", () => {
    const request = (overrides: Partial<StudentRestore>): StudentRestore => ({
      id: "r",
      studentId: "s",
      venueId: "venue-1",
      token: "TOKEN42",
      name: "Ada",
      surname: "Lovelace",
      approvalCode: 1234,
      status: "pending",
      createdAt: new Date(),
      ...overrides,
    });

    const restores = [
      request({ id: "r1", studentId: "s1", name: "Grace", surname: "Hopper", approvalCode: 111 }),
      request({ id: "r2", studentId: "s2", name: "Alan", surname: "Turing", approvalCode: 222 }),
      request({ id: "r3", studentId: "s1", name: "Grace", surname: "Hopper", approvalCode: 333 }),
      request({ id: "r4", studentId: "s3", name: "Ada", surname: "Lovelace", approvalCode: 444 }),
    ];

    function requestRows() {
      const table = screen.getByText("Rifiuta").closest("table")!;
      return within(table).getAllByRole("row").slice(1);
    }

    it("shows no requests before the contest has a code", () => {
      renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        venue: { token: undefined },
        restores,
      });
      expect(screen.getByText("Nessuna richiesta.")).toBeInTheDocument();
    });

    it("shows a placeholder without requests", () => {
      renderDashboard({ contest: { onlineSettings: onlineSettings() } });
      expect(screen.getByText("Nessuna richiesta.")).toBeInTheDocument();
    });

    it("groups requests by student, sorted by surname", () => {
      renderDashboard({ contest: { onlineSettings: onlineSettings() }, restores });
      expect(
        requestRows().map((row) =>
          within(row)
            .getAllByRole("cell")
            .slice(0, 2)
            .map((cell) => cell.textContent),
        ),
      ).toEqual([
        ["Hopper", "Grace"],
        ["Lovelace", "Ada"],
        ["Turing", "Alan"],
      ]);
    });

    it("rejects all the requests of a student", async () => {
      const user = userEvent.setup();
      const { reject } = renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        restores,
      });
      const [hopper] = requestRows();
      await user.click(within(hopper).getAllByRole("button")[0]);
      expect(reject).toHaveBeenCalledExactlyOnceWith("s1");
    });

    it("approves the request matching the confirmation code", async () => {
      const user = userEvent.setup();
      const { approve } = renderDashboard({
        contest: { onlineSettings: onlineSettings() },
        restores,
      });
      const [hopper] = requestRows();
      await user.click(within(hopper).getAllByRole("button")[1]);

      const dialog = within(hopper).getByRole("dialog");
      const code = within(dialog).getByLabelText(/Codice di conferma/);
      const approveButton = within(dialog).getByRole("button", { name: "Approva" });

      await user.type(code, "222"); // code of another student
      expect(approveButton).toBeDisabled();

      await user.clear(code);
      await user.type(code, "333");
      expect(approveButton).toBeEnabled();
      await user.click(approveButton);
      await waitFor(() => expect(approve).toHaveBeenCalledOnce());
      expect(approve.mock.calls[0][0]).toMatchObject({ id: "r3", approvalCode: 333 });
    });
  });

  describe("PDF downloads", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("are offered only for contests with a paper version", () => {
      renderDashboard();
      expect(screen.queryByRole("button", { name: /Scarica ZIP/ })).not.toBeInTheDocument();
    });

    it("downloads a ZIP of the statements of a single-language contest", async () => {
      const user = userEvent.setup();
      const getPdfStatements = vi.fn().mockResolvedValue({ "101": new ArrayBuffer(8) });
      renderDashboard({ contest: { hasOffline: true }, getPdfStatements });

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Scarica ZIP con tutti i testi" }));

      await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
      expect(getPdfStatements).toHaveBeenCalledExactlyOnceWith({ language: undefined });
      expect(vi.mocked(saveAs).mock.calls[0][1]).toBe("venue-1.zip");
    });

    it("downloads the statements in the selected language", async () => {
      const user = userEvent.setup();
      const getPdfStatements = vi.fn().mockResolvedValue({ "101": new ArrayBuffer(8) });
      renderDashboard({ contest: { hasOffline: true, languages: ["it", "en"] }, getPdfStatements });

      const select = screen.getByRole("combobox", { name: "Lingua dei testi" });
      expect(select).toHaveValue("it");
      await user.selectOptions(select, "en");
      await user.click(screen.getByRole("button", { name: "Scarica ZIP con tutti i testi" }));

      await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
      expect(getPdfStatements).toHaveBeenCalledExactlyOnceWith({ language: "en" });
      expect(vi.mocked(saveAs).mock.calls[0][1]).toBe("venue-1.en.zip");
    });
  });
});
