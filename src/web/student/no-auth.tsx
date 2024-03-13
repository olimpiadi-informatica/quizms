import React, { ReactNode, SetStateAction, useCallback, useMemo, useState } from "react";

import { addMinutes } from "date-fns";
import { isFunction, range } from "lodash-es";

import { useIsAfter } from "~/components";
import { Contest, Participation, Student } from "~/models";

import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  questionCount?: number;
  children: ReactNode;
};

export function NoAuth({ contestName, duration, questionCount, children }: AuthProps) {
  const [student, setStudent] = useLocalStorage<Student>("student", {
    id: "",
    personalInformation: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    variant: "0",
  });

  const endTime = useMemo(
    () => student.startedAt && addMinutes(student.startedAt, duration),
    [student.startedAt, duration],
  );

  const terminated = useIsAfter(endTime);

  const mockContest: Contest = {
    id: "",
    name: contestName,
    longName: contestName,
    problemIds: range(questionCount ?? 0).map((i) => i.toString()),
    duration,
    personalInformation: [],
    hasVariants: true,
    hasOnline: true,
    hasPdf: true,
    allowRestart: true,
    allowStudentImport: true,
    allowStudentEdit: true,
    allowStudentDelete: true,
    allowAnswerEdit: true,
    statementVersion: 1,
  };

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    contestId: "",
    name: "",
    teacher: "",
    startingTime: student.startedAt,
    finalized: false,
  };

  const reset = useCallback(async () => {
    setStudent((student) => ({
      ...student,
      answers: {},
      extraData: {},
      startedAt: undefined,
      submittedAt: undefined,
    }));
  }, [setStudent]);

  return (
    <StudentProvider
      contest={mockContest}
      participation={mockParticipation}
      student={student}
      setStudent={async (s) => setStudent(s)}
      reset={reset}
      terminated={terminated}>
      {children}
    </StudentProvider>
  );
}

function useLocalStorage<T>(key: string, defaultValue: T, parser?: (value: string) => T) {
  const fullKey = `${window.location.pathname}#${key}`;
  const prev = localStorage.getItem(fullKey);

  const [value, setValue] = useState<T>(prev ? (parser ?? JSON.parse)(prev) : defaultValue);

  const set = useCallback(
    (value: SetStateAction<T>) => {
      setValue((oldValue) => {
        const newValue = isFunction(value) ? value(oldValue) : value;
        if (newValue === undefined) {
          localStorage.removeItem(fullKey);
        } else {
          localStorage.setItem(fullKey, JSON.stringify(newValue));
        }
        return newValue;
      });
    },
    [fullKey],
  );

  return [value, set] as const;
}
