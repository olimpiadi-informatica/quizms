import React, { ReactNode, createContext, useContext } from "react";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Teacher } from "~/models/teacher";
import { Variant } from "~/models/variant";

type TeacherProviderProps = {
  /** Nome dell'insegnante */
  teacher: Teacher;
  /** Scuola dell'insegnante */
  school: School;
  /** Contest attivi */
  contests: Contest[];
  /** Varianti dei contest */
  variants: Variant[];
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
  return <TeacherContext.Provider value={props}>{children}</TeacherContext.Provider>;
}

export function useTeacher() {
  return useContext(TeacherContext);
}
