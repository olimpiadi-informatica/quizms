import { createContext, use } from "react";

import type {
  Announcement,
  Contest,
  Participation,
  Student,
  StudentRestore,
  Variant,
} from "~/models";

export type TeacherContextProps = {
  /** Tutte le partecipazioni */
  participations: Participation[];
  /** Partecipazione selezionata */
  participation: Participation;

  /** Tutte le gare */
  contests: Contest[];
  /** Gara selezionata */
  contest: Contest;

  /** Funzione per iniziare la gara */
  startParticipation: (participationId: string, startingTime: Date | null) => Promise<void>;
  /** Funzione per finalizzare i risultati della gara */
  finalizeParticipation: (participationId: string) => Promise<void>;

  /** Varianti dei testi */
  variants: Record<string, Variant>;
  /** Funzione per effettuare il logout */
  logout: () => Promise<void>;
  /** Funzione per ottenere i pdf dei testi */
  getPdfStatements: () => Promise<Record<string, ArrayBuffer>>;
  /** Hook per ottenere gli annunci */
  useAnnouncements: (participationId: string) => Announcement[];
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

export type OmitContestParam<T> = {
  [K in keyof T]: T[K] extends (contestId: string, ...args: infer Args) => infer Ret
    ? (...args: Args) => Ret
    : T[K];
};

export function useTeacher(): Omit<OmitContestParam<TeacherContextProps>, `use${string}`> {
  const { startParticipation, finalizeParticipation, ...ctx } = use(TeacherContext);
  const participationId = ctx.participation.id;

  return {
    ...ctx,
    startParticipation: (startingTime: Date | null) =>
      startParticipation(participationId, startingTime),
    finalizeParticipation: () => finalizeParticipation(participationId),
  };
}

export function useTeacherAnnouncements() {
  const { participation, useAnnouncements } = use(TeacherContext);
  return useAnnouncements(participation.id);
}

export function useTeacherStudents() {
  const { participation, useStudents } = use(TeacherContext);
  return useStudents(participation.id);
}

export function useTeacherStudentRestores() {
  const { participation, useStudentRestores } = use(TeacherContext);
  return useStudentRestores(participation.id, participation.token ?? "");
}
