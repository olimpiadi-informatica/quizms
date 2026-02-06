import { createContext, use } from "react";

import type { Contest, Participation, Schema, Student } from "~/models";

export type StudentContextProps = {
  student: Student;
  setStudent: (value: Student) => Promise<void> | void;
  contest: Contest;
  participation: Participation;
  reset?: () => Promise<void> | void;
  onSubmit?: () => Promise<void> | void;
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
