import { ReactNode, createContext, useContext } from "react";

import { Contest, Participation, Student } from "~/models";

import { StudentLayout } from "./layout";

type StudentProviderProps = {
  /** Dati dello studente */
  student: Student;
  /** Funzione per aggiornare i dati dello studente */
  setStudent: (value: Student) => Promise<void> | void;
  /** Contest dello studente */
  contest: Contest;
  /** Scuola dello studente */
  participation: Participation;
  /** Funzione per resettare le risposte e ricominciare la prova (opzionale) */
  reset?: () => Promise<void> | void;
  /** Funzione per terminare la prova (opzionale) */
  submit?: () => Promise<void> | void;
  /** Funzione per cambiare utente */
  logout?: () => Promise<void> | void;
  /** Flag che indica se la prova è terminata */
  terminated: boolean;
};

const StudentContext = createContext<StudentProviderProps>({} as StudentProviderProps);
StudentContext.displayName = "StudentContext";

export function StudentProvider({
  children,
  ...props
}: StudentProviderProps & {
  children: ReactNode;
}) {
  const value: StudentProviderProps = {
    ...props,
    terminated: props.terminated || !!props.student.submittedAt,
  };

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}
