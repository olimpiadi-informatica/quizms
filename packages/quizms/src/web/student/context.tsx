import { createContext, type Dispatch, type SetStateAction, use } from "react";

import type { ClientSchema, Contest, Participation, Student } from "~/models";

export type StudentContextProps = {
  student: Student;
  setStudent: (value: Student) => Promise<void> | void;
  contest: Contest;
  participation: Participation;
  reset?: () => Promise<void> | void;
  onSubmit?: () => Promise<void> | void;
  logout?: () => Promise<void> | void;
  terminated: boolean;
  schema: ClientSchema;
  registerSchema: Dispatch<SetStateAction<ClientSchema>>;
};

export const StudentContext = createContext<StudentContextProps>({} as StudentContextProps);
StudentContext.displayName = "StudentContext";

export function useStudent() {
  return use(StudentContext);
}
