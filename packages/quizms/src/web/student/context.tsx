import { createContext, use } from "react";

import type { Answer, Contest, Participation, Schema, Student } from "~/models";

export type StudentContextProps = {
  student: Student;
  setAnswer: (problemId: string, answer: Answer | undefined) => Promise<void> | void;
  contest: Contest;
  participation: Participation;
  reset?: () => Promise<void> | void;
  submit: () => Promise<void> | void;
  logout?: () => Promise<void> | void;
  enforceFullscreen: boolean;
  terminated: boolean;
  schema?: Schema;
};

export const StudentContext = createContext<StudentContextProps>({} as StudentContextProps);
StudentContext.displayName = "StudentContext";

export function useStudent() {
  return use(StudentContext);
}
