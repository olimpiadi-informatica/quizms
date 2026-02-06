import type { ReactNode } from "react";

import { useIsAfter } from "@olinfo/react-components";

import type { Contest, Participation, Schema, Student } from "~/models";

import { StudentContext, type StudentContextProps } from "./context";
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
  /** Funzione eseguita quando lo studente ha terminato la prova (opzionale) */
  onSubmit?: () => Promise<void> | void;
  /** Funzione per cambiare utente */
  logout?: () => Promise<void> | void;
  /** Flag che indica se è obbligatorio entrare in fullscreen */
  enforceFullscreen: boolean;
  /** Flag che indica se la prova è terminata */
  terminated: boolean;
  /** Risposte corrette */
  schema?: Schema;
};

export function StudentProvider({
  children,
  student,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const terminated = useIsAfter(student.finishedAt) ?? false;

  const value: StudentContextProps = {
    ...props,
    student,
    terminated,
  };

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}
