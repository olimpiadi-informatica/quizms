import type { ReactNode } from "react";

import { useIsAfter } from "@olinfo/react-components";

import type { Answer, Contest, Schema, Student, Venue } from "~/models";

import { StudentContext, type StudentContextProps } from "./context";
import { StatementLanguageContext } from "./language";
import { StudentLayout } from "./layout";

type StudentProviderProps = {
  /** Student data */
  student: Student;
  /** Function to update student answers */
  setAnswer: (problemId: string, answer: Answer) => Promise<void> | void;
  /** Contest data */
  contest: Contest;
  /** School data */
  venue: Venue;
  /** Function to reset answers and restart the test (optional) */
  reset?: () => Promise<void> | void;
  /** Function to end the test */
  submit: () => Promise<void> | void;
  /** Function to change user (optional) */
  logout?: () => Promise<void> | void;
  /** Whether fullscreen is required */
  enforceFullscreen: boolean;
  /** Whether the test is completed */
  terminated: boolean;
  /** Correct answers */
  schema?: Schema;
  /** Language of the statement being shown (defaults to the contest default language) */
  language?: string;
  /** Function to change the statement language (optional) */
  setLanguage?: (language: string) => void;
};

export function StudentProvider({
  children,
  student,
  language,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const terminated = useIsAfter(student.participationWindow?.end) ?? false;

  const value: StudentContextProps = {
    ...props,
    student,
    terminated,
    // Contests stored before `languages` existed don't have the field
    language: language ?? props.contest.languages?.[0] ?? "it",
  };

  return (
    <StudentContext.Provider value={value}>
      <StatementLanguageContext.Provider value={value.language}>
        <StudentLayout>{children}</StudentLayout>
      </StatementLanguageContext.Provider>
    </StudentContext.Provider>
  );
}
