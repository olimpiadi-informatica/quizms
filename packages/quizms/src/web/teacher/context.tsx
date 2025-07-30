import { createContext, useContext } from "react";

import type { Contest, Participation, Student, StudentRestore, Variant } from "~/models";

export type TeacherContextProps = {
  /** Tutte le partecipazioni */
  participations: Participation[];
  /** Partecipazione selezionata */
  participation: Participation;
  /** Funzione per modificare i dati della scuola */
  setParticipation: (participation: Participation) => Promise<void>;

  /** Tutte le gare */
  contests: Contest[];
  /** Gara selezionata */
  contest: Contest;

  /** Varianti dei testi */
  variants: Record<string, Variant>;
  /** Funzione per effettuare il logout */
  logout: () => Promise<void>;
  /** Funzione per ottenere i pdf dei testi */
  getPdfStatements: () => Promise<Record<string, Uint8Array | ArrayBuffer>>;
  /** Hook per ottenere gli studenti di una scuola */
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
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
