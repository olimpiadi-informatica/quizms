import React, { ReactNode, createContext, useContext } from "react";

import { Contest, School, Solution, Student, Variant } from "~/models";

import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  /** Scuola dell'insegnante */
  schools: School[];
  /** Funzione per modificare i dati della scuola */
  setSchool: (school: School) => Promise<void>;
  /** Studenti della scuola */
  students: Student[];
  /** Funzione per modificare gli studenti della scuola */
  setStudent: (student: Student) => Promise<void>;
  /** Contest attivi */
  contests: Contest[];
  /** Varianti dei contest */
  variants: Variant[];
  /** Soluzioni delle varianti */
  solutions: Solution[];
  /** Funzione per effettuare il logout */
  logout: () => Promise<void>;
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

export function useTeacher() {
  return useContext(TeacherContext);
}
