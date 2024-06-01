import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { isEqual } from "lodash-es";

import { Contest, Participation, Schema, Student } from "~/models";

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

type StudentContextProps = StudentProviderProps & {
  schema: Schema;
  registerSchema: Dispatch<SetStateAction<Schema>>;
};

const StudentContext = createContext<StudentContextProps>({} as StudentContextProps);
StudentContext.displayName = "StudentContext";

export function StudentProvider({
  children,
  ...props
}: StudentProviderProps & {
  children: ReactNode;
}) {
  const [schema, registerSchema] = useState<Schema>({});

  const value: StudentContextProps = {
    ...props,
    terminated: props.terminated || !!props.student.submittedAt,
    schema,
    registerSchema,
  };

  useEffect(() => {
    const answers = { ...props.student.answers };
    for (const id in schema) {
      answers[id] = undefined;
    }
    if (!isEqual(answers, props.student.answers)) {
      props.setStudent({ ...props.student, answers });
    }
  }, [props, schema]);

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}
