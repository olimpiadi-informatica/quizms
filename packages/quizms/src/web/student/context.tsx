import { createContext, type Dispatch, type SetStateAction, useContext } from "react";

import type { Contest, Participation, Schema, Student } from "~/models";

export type StudentContextProps = {
  student: Student;
  setStudent: (value: Student) => Promise<void> | void;
  contest: Contest;
  participation: Participation;
  reset?: () => Promise<void> | void;
  onSubmit?: () => Promise<void> | void;
  logout?: () => Promise<void> | void;
  terminated: boolean;
  schema: Schema;
  registerSchema: Dispatch<SetStateAction<Schema>>;
};

export const StudentContext = createContext<StudentContextProps>({} as StudentContextProps);
StudentContext.displayName = "StudentContext";

export function useStudent() {
  return useContext(StudentContext);
}
