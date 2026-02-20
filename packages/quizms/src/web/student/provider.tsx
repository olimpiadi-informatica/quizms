import type { ReactNode } from "react";

import { useIsAfter } from "@olinfo/react-components";

import type { Answer, Contest, Participation, Schema, Student } from "~/models";

import { StudentContext, type StudentContextProps } from "./context";
import { StudentLayout } from "./layout";

type StudentProviderProps = {
  /** Student data */
  student: Student;
  /** Function to update student answers */
  setAnswer: (problemId: string, answer: Answer | undefined) => Promise<void> | void;
  /** Contest data */
  contest: Contest;
  /** School data */
  participation: Participation;
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
};

export function StudentProvider({
  children,
  student,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const terminated = useIsAfter(student.finishedAt) ?? false;

  const value: StudentContextProps = {
    ...props,
    student,
    terminated,
  };

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}
