import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useIsAfter } from "@olinfo/react-components";

import { type Contest, type Participation, type Schema, type Student, calcScore } from "~/models";

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
  student,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const [schema, registerSchema] = useState<Schema>({});
  const terminated = useIsAfter(student.finishedAt) ?? false;

  const setStudentAndScore = useCallback(
    async (student: Student) => {
      if (process.env.QUIZMS_MODE === "training") {
        await setStudent({ ...student, score: calcScore(student, schema) });
      } else {
        await setStudent(student);
      }
    },
    [setStudent, schema],
  );

  const value: StudentContextProps = {
    ...props,
    student,
    setStudent: setStudentAndScore,
    terminated,
    schema,
    registerSchema,
  };

  useEffect(() => {
    if (process.env.QUIZMS_MODE === "training" && student.maxScore == null) {
      let maxScore = 0;
      const answers = { ...student.answers };
      for (const id in schema) {
        maxScore += schema[id].maxPoints;
        answers[id] ??= null;
      }
      setStudent({ ...student, maxScore, answers });
    }
  }, [student, setStudent, schema]);

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}
