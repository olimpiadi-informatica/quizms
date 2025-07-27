import { createContext, useContext } from "react";

import type { Contest, Participation, Student, StudentRestore, Variant } from "~/models";

export type TeacherContextProps = {
  /** All participations */
  participations: Participation[];
  /** The selected participation */
  participation: Participation;
  /** Function to edit the school's data */
  setParticipation: (participation: Participation) => Promise<void>;

  /** All contests */
  contests: Contest[];
  /** The selected contest */
  contest: Contest;

  /** The variants of the statements */
  variants: Record<string, Variant>;
  /** Function to log out */
  logout: () => Promise<void>;
  /** Function to get the pdf of the statements */
  getPdfStatements: () => Promise<Record<string, Uint8Array | ArrayBuffer>>;
  /** Hook to get the students of a school */
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook to get the student access requests */
  useStudentRestores: (
    participationId: string,
    token: string,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

export const TeacherContext = createContext<TeacherContextProps>({} as TeacherContextProps);
TeacherContext.displayName = "TeacherContext";

export function useTeacher(): Omit<TeacherContextProps, "useStudents" | "useStudentRestores"> {
  return useContext(TeacherContext);
}

export function useTeacherStudents() {
  const { participation, useStudents } = useContext(TeacherContext);
  return useStudents(participation.id);
}

export function useTeacherStudentRestores() {
  const { participation, useStudentRestores } = useContext(TeacherContext);
  return useStudentRestores(participation.id, participation.token ?? "");
}
