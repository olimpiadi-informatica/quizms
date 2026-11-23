// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Contest, Student } from "~/models";
import { StudentContext, type StudentContextProps } from "~/web/student/context";
import { StatementLanguageContext } from "~/web/student/language";

import { makeContest, makeStudent, studentProviderProps } from "../test-utils";
import { StudentForm } from "./student-form";
import { UiLanguageProvider } from "./ui-language-provider";

function renderForm({
  contest = makeContest(),
  student = makeStudent(),
  language,
  printLayout,
}: {
  contest?: Contest;
  student?: Student;
  language?: string;
  printLayout?: boolean;
}) {
  const value: StudentContextProps = {
    ...studentProviderProps({ contest, student }),
    student,
    phase: "ongoing",
    terminated: false,
    language: language ?? "it",
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StudentContext.Provider value={value}>
      <StatementLanguageContext.Provider value={language}>
        <UiLanguageProvider language={language ?? "it"}>{children}</UiLanguageProvider>
      </StatementLanguageContext.Provider>
    </StudentContext.Provider>
  );
  return render(<StudentForm printLayout={printLayout} />, { wrapper: Wrapper });
}

const classField: Contest["userData"][number] = {
  name: "classYear",
  label: "Classe",
  type: "number",
  min: 1,
  max: 5,
};

describe("StudentForm", () => {
  it("shows the student data and the variant in read-only fields", () => {
    renderForm({});
    expect(screen.getByLabelText(/Nome/)).toHaveValue("Ada");
    expect(screen.getByLabelText(/Cognome/)).toHaveValue("Lovelace");
    expect(screen.getByLabelText(/Codice prova/)).toHaveValue("101");
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).toBeDisabled();
    }
  });

  it("renders one field per user data entry, with Italian placeholders", () => {
    renderForm({
      contest: makeContest({ userData: [...makeContest().userData, classField] }),
      student: makeStudent({ userData: { name: "Ada", surname: "Lovelace", classYear: 3 } }),
    });
    const classInput = screen.getByLabelText(/Classe/);
    expect(classInput).toHaveValue(3);
    expect(classInput).toHaveAttribute("placeholder", "Inserisci classe");
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute("placeholder", "Inserisci nome");
  });

  it("hides the variant code for contests without variants", () => {
    renderForm({ contest: makeContest({ hasVariants: false }) });
    expect(screen.queryByLabelText(/Codice prova/)).not.toBeInTheDocument();
  });

  it("uses the statement language online", () => {
    renderForm({ language: "en" });
    expect(screen.getByLabelText(/Test code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute("placeholder", "Enter nome");
  });

  it("uses the statement language in printed booklets", () => {
    renderForm({ language: "en", printLayout: true });
    expect(screen.getByLabelText(/Test code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute("placeholder", "Enter nome");
  });

  it("prints every field as plain text", () => {
    renderForm({
      contest: makeContest({ userData: [...makeContest().userData, classField] }),
      printLayout: true,
    });
    expect(screen.getByLabelText(/Classe/)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/Codice prova/)).toBeInTheDocument();
  });
});
