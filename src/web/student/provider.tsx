import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useIsAfter } from "@olinfo/react-components";
import { isEqual } from "lodash-es";

import { Contest, Participation, Schema, Student, calcScore } from "~/models";

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
  setStudent,
  children,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const [schema, registerSchema] = useState<Schema>({});
  const terminated = useIsAfter(props.student.finishedAt) ?? false;

  const value: StudentContextProps = {
    ...props,
    setStudent: (student) => setStudent({ ...student, score: calcScore(student, schema) }),
    terminated,
    schema,
    registerSchema,
  };

  useEffect(() => {
    let maxScore = 0;
    const answers = { ...props.student.answers };
    for (const id in schema) {
      maxScore += schema[id].pointsCorrect ?? 0;
      answers[id] ??= null;
    }
    if (maxScore !== props.student.maxScore || !isEqual(answers, props.student.answers)) {
      const newStudent: Student = { ...props.student, maxScore, answers };
      newStudent.score = calcScore(newStudent, schema);
      setStudent(newStudent);
    }
  }, [props, setStudent, schema]);

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}
