import React, { ReactNode, SetStateAction, useCallback, useMemo, useState } from "react";

import { addMinutes } from "date-fns";
import { isFunction, range } from "lodash-es";

import { Contest, School, Student } from "~/models";

import { useIsAfter } from "../components/time";
import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  questionCount?: number;
  children: ReactNode;
};

export function NoAuth({ contestName, duration, questionCount, children }: AuthProps) {
  const [submitted, setSubmitted] = useLocalStorage("submit", false);

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
    problemIds: range(questionCount ?? 0).map((i) => i.toString()),
    duration,
    personalInformation: [],
    hasVariants: true,
    allowRestart: true,
  };

  const mockSchool: School = {
    id: "",
    schoolId: "",
    contestId: "",
    name: "",
    teacher: "",
    startingTime: student.startedAt,
    finalized: false,
  };

  const reset = useCallback(() => {
    setSubmitted(false);
    setStudent((student) => ({
      ...student,
      answers: {},
      startedAt: undefined,
    }));
  }, [setStudent, setSubmitted]);

  return (
    <StudentProvider
      contest={mockContest}
      school={mockSchool}
      student={student}
      setStudent={async (s) => setStudent(s)}
      submit={() => setSubmitted(true)}
      reset={reset}
      terminated={terminated || submitted}>
      {children}
    </StudentProvider>
  );
}

export function useLocalStorage<T>(key: string, defaultValue: T, parser?: (value: string) => T) {
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
