import React, { ReactNode, createContext, useContext } from "react";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student } from "~/models/student";

type StudentProviderProps = {
  /** Dati dello studente */
  student: Student;
  /** Funzione per aggiornare i dati dello studente */
  setStudent: (value: Student) => Promise<void>;
  /** Contest dello studente */
  contest: Contest;
  /** Scuola dello studente */
  school: School;
  /** Variante della prova */
  variant: number;
  /** Funzione per terminare la prova e inviare le risposte */
  submit: () => void;
  /** Funzione per resettare le risposte e ricominciare la prova (opzionale) */
  reset?: () => void;
  /** Flag che indica se la prova è terminata */
  terminated: boolean;
};

const StudentContext = createContext<StudentProviderProps>({} as StudentProviderProps);
StudentContext.displayName = "StudentContext";

export function StudentProvider({
  children,
  ...rest
}: StudentProviderProps & {
  children: ReactNode;
}) {
  return <StudentContext.Provider value={{ ...rest }}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  return useContext(StudentContext);
}
