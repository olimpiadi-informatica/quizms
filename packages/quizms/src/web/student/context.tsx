import { createContext, use } from "react";

import type { Answer, Contest, Schema, Student, Venue } from "~/models";

export type StudentContextProps = {
  student: Student;
  setAnswer: (problemId: string, answer: Answer) => Promise<void> | void;
  contest: Contest;
  venue: Venue;
  reset?: () => Promise<void> | void;
  submit: () => Promise<void> | void;
  logout?: () => Promise<void> | void;
  enforceFullscreen: boolean;
  terminated: boolean;
  started: boolean;
  schema?: Schema;
};

export const StudentContext = createContext<StudentContextProps>({} as StudentContextProps);
StudentContext.displayName = "StudentContext";

export function useStudent() {
  return use(StudentContext);
}
