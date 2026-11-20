// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Student } from "~/models";

import { makeStudent, schema, studentProviderProps } from "../test-utils";
import { StudentContext, type StudentContextProps } from "./context";
import { PointsTable } from "./modals";

function StudentContextWrapper({ student, children }: { student: Student; children: ReactNode }) {
  const value: StudentContextProps = {
    ...studentProviderProps({ student }),
    student,
    terminated: true,
    language: "it",
  };
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

function renderTable(student: Student) {
  render(
    <StudentContextWrapper student={student}>
      <PointsTable schema={schema} />
    </StudentContextWrapper>,
  );
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((row) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  );
}

describe("PointsTable", () => {
  it("shows the score over the maximum score", () => {
    renderTable(makeStudent({ score: 11 }));
    expect(screen.getByText(/Hai ottenuto/)).toHaveTextContent(
      "Hai ottenuto un punteggio di 11 su 20.",
    );
  });

  it("lists problems in numeric order with answers, solutions and points", () => {
    const rows = renderTable(
      makeStudent({
        answers: {
          "1": { type: "multipleChoice", value: "B" },
          "2": { type: "multipleResponse", value: ["C", "A"] },
          "3": { type: "openText", value: "abd" },
          "10": { type: "openNumber", value: 43 },
        },
      }),
    );
    expect(rows).toEqual([
      // problem, answer, solution, points
      ["1", "B", "B", "5"],
      ["2", "CA", "A e C", "5"],
      ["3", "abd", "ABC", "0"],
      ["10", "43", "42 oppure 43", "5"],
    ]);
  });

  it("gives blank points to missing and blank answers", () => {
    const rows = renderTable(
      makeStudent({ answers: { "1": { type: "multipleChoice", value: undefined } } }),
    );
    expect(rows.map((row) => row[3])).toEqual(["1", "1", "1", "1"]);
  });

  // BUG: `PointsTable` renders `displayAnswer(answer) ?? "-"` (src/web/student/modals.tsx:51), but
  // `displayAnswer` returns `""` (never `null`/`undefined`) for blank answers, so the "-"
  // placeholder is never shown and the "Risposta" cell is empty. Fix: use `||` instead of `??`.
  it("shows blank and missing answers as a dash", () => {
    const rows = renderTable(
      makeStudent({ answers: { "1": { type: "multipleChoice", value: undefined } } }),
    );
    expect(rows.map((row) => row[1])).toEqual(["-", "-", "-", "-"]);
  });
});
