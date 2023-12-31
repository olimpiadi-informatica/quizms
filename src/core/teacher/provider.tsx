import React, { ReactNode, createContext, useContext } from "react";

import { Contest, Participation, Pdf, Solution, Student, StudentRestore, Variant } from "~/models";

import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  /** Scuola dell'insegnante */
  participations: Participation[];
  /** Funzione per modificare i dati della scuola */
  setParticipation: (participation: Participation) => Promise<void>;
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
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
  useStudentRestores: (
    participation: Participation,
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

export function useTeacherStudents(participationId: string) {
  const { useStudents } = useContext(TeacherContext);
  return useStudents(participationId);
}

export function useTeacherStudentRestores(participation: Participation) {
  const { useStudentRestores } = useContext(TeacherContext);
  return useStudentRestores(participation);
}
