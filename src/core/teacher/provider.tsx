import React, { ReactNode, createContext, useContext } from "react";

import { Contest, Pdf, School, Solution, Student, StudentRestore, Variant } from "~/models";

import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  /** Scuola dell'insegnante */
  schools: School[];
  /** Funzione per modificare i dati della scuola */
  setSchool: (school: School) => Promise<void>;
  /** Contest attivi */
  contests: Contest[];
  /** Varianti dei contest */
  variants: Variant[];
  /** Soluzioni delle varianti */
  solutions: Solution[];
  /** Funzione per effettuare il logout */
  logout: () => Promise<void>;
  /** Funzione per ottenere i pdf dei testi */
  getPdfStatements: (pdfVariants: string[]) => Promise<Pdf[]>;
  /** Hook per ottenere gli studenti di una scuola */
  useStudents: (schoolId: string) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
  useStudentRestores: (
    school: School,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

const TeacherContext = createContext<TeacherProviderProps>({} as TeacherProviderProps);
TeacherContext.displayName = "TeacherContext";

export function TeacherProvider({
  children,
  ...props
}: TeacherProviderProps & {
  children: ReactNode;
}) {
  return (
    <TeacherContext.Provider value={props}>
      <TeacherLayout>{children}</TeacherLayout>
    </TeacherContext.Provider>
  );
}

export function useTeacher(): Omit<TeacherProviderProps, "useStudents" | "useStudentRestores"> {
  return useContext(TeacherContext);
}

export function useTeacherStudents(schoolId: string) {
  const { useStudents } = useContext(TeacherContext);
  return useStudents(schoolId);
}

export function useTeacherStudentRestores(school: School) {
  const { useStudentRestores } = useContext(TeacherContext);
  return useStudentRestores(school);
}
