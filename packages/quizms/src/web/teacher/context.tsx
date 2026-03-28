import { createContext, use } from "react";

import type { Announcement, Contest, Student, StudentRestore, Variant, Venue } from "~/models";

export type TeacherContextProps = {
  /** Tutte le partecipazioni */
  venues: Venue[];
  /** Partecipazione selezionata */
  venue: Venue;

  /** Tutte le gare */
  contests: Contest[];
  /** Gara selezionata */
  contest: Contest;

  /** Funzione per iniziare la gara */
  startContestWindow: (venueId: string) => Promise<void>;
  /** Funzione per annullare la gara */
  stopContestWindow: (venueId: string) => Promise<void>;
  /** Funzione per finalizzare i risultati della gara */
  finalizeVenue: (venueId: string) => Promise<void>;

  /** Varianti dei testi */
  variants: Record<string, Variant>;
  /** Funzione per effettuare il logout */
  logout: () => void | Promise<void>;
  /** Funzione per ottenere i pdf dei testi */
  getPdfStatements: () => Promise<Record<string, ArrayBuffer>>;
  /** Hook per ottenere gli annunci */
  useAnnouncements: (contestId: string) => Announcement[];
  /** Hook per ottenere gli studenti di una scuola */
  useStudents: (venueId: string) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
  useStudentRestores: (
    venueId: string,
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
  const { startContestWindow, stopContestWindow, finalizeVenue, ...ctx } = use(TeacherContext);
  const venueId = ctx.venue.id;

  return {
    ...ctx,
    startContestWindow: () => startContestWindow(venueId),
    stopContestWindow: () => stopContestWindow(venueId),
    finalizeVenue: () => finalizeVenue(venueId),
  };
}

export function useTeacherAnnouncements() {
  const { contest, useAnnouncements } = use(TeacherContext);
  return useAnnouncements(contest.id);
}

export function useTeacherStudents() {
  const { venue, useStudents } = use(TeacherContext);
  return useStudents(venue.id);
}

export function useTeacherStudentRestores() {
  const { venue, useStudentRestores } = use(TeacherContext);
  return useStudentRestores(venue.id, venue.token ?? "");
}
