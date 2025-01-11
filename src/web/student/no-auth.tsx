import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { Contest, Participation, Student } from "~/models";

import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  contestLongName: string;
  duration: number;
  children: ReactNode;
};

export function NoAuth({ contestName, contestLongName, duration, children }: AuthProps) {
  const [student, setStudent] = useLocalStorage<Student>({
    id: "",
    userData: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    variant: "0",
  });

  const mockContest: Contest = {
    id: "",
    name: contestName,
    longName: contestLongName,
    problemIds: [],
    duration,
    userData: [],
    hasVariants: true,
    hasOnline: true,
    hasPdf: true,
    allowRestart: true,
    allowStudentImport: true,
    allowStudentEdit: true,
    allowStudentDelete: true,
    allowAnswerEdit: true,
    contestWindowEnd: new Date(0),
    contestWindowStart: new Date(Number.MAX_SAFE_INTEGER),
  };

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    contestId: "",
    name: "",
    teacher: "",
    startingTime: student.startedAt,
    finalized: false,
    disabled: false,
  };

  const reset = useCallback(async () => {
    setStudent(
      (student): Student => ({
        ...student,
        answers: {},
        extraData: {},
        startedAt: undefined,
        finishedAt: undefined,
      }),
    );
  }, [setStudent]);

  return (
    <StudentProvider
      contest={mockContest}
      participation={mockParticipation}
      student={student}
      setStudent={setStudent}
      reset={reset}>
      {children}
    </StudentProvider>
  );
}

function useLocalStorage<T>(defaultValue: T) {
  const key = window.location.pathname;

  const [value, setValue] = useState<T>(() => {
    return JSON.parse(localStorage.getItem("quizms") ?? "{}")[key] ?? defaultValue;
  });

  useEffect(() => {
    const storage = JSON.parse(localStorage.getItem("quizms") ?? "{}");
    storage[key] = value;
    localStorage.setItem("quizms", JSON.stringify(storage));
  }, [key, value]);

  return [value, setValue] as const;
}
