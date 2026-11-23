import type { ReactNode } from "react";

import {
  type Answer,
  type Contest,
  isStudentTerminated,
  type Schema,
  type Student,
  type StudentPhase,
  type Venue,
} from "~/models";
import { UiLanguageProvider } from "~/web/components/ui-language-provider";

import { StudentContext, type StudentContextProps } from "./context";
import { StatementLanguageContext } from "./language";
import { StudentLayout } from "./layout";
import { useStudentPhase } from "./phase";

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
  /** Phase of the student (see `getStudentPhase`) */
  phase: StudentPhase;
  /** Whether the test is completed (submitted or expired) */
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
}: Omit<StudentProviderProps, "terminated" | "phase"> & {
  children: ReactNode;
}) {
  const phase = useStudentPhase(student);
  const terminated = isStudentTerminated(phase);

  const value: StudentContextProps = {
    ...props,
    student,
    phase,
    terminated,
    // Contests stored before `languages` existed don't have the field
    language: language ?? props.contest.languages?.[0] ?? "it",
  };

  return (
    <StudentContext.Provider value={value}>
      <StatementLanguageContext.Provider value={value.language}>
        {/* The UI is in the language of the statement. */}
        <UiLanguageProvider language={value.language}>
          <StudentLayout>{children}</StudentLayout>
        </UiLanguageProvider>
      </StatementLanguageContext.Provider>
    </StudentContext.Provider>
  );
}
