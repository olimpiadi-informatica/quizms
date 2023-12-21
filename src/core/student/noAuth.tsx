import React, { ReactNode, SetStateAction, useCallback, useMemo, useState } from "react";

import { addMinutes } from "date-fns";
import { isFunction, range } from "lodash-es";

import { Contest, School, Student } from "~/models";

import { useUpdateAt } from "../components/time";
import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  questionCount?: number;
  children: ReactNode;
};

export function NoAuth({ contestName, duration, questionCount, children }: AuthProps) {
  const [submitted, setSubmitted] = useLocalStorage("submit", false);

  const [startTime, setStartTime] = useLocalStorage<Date | undefined>(
    "startTime",
    undefined,
    (value) => (value !== "undefined" ? new Date(JSON.parse(value)) : undefined),
  );
  const endTime = useMemo(
    () => startTime && addMinutes(startTime, duration),
    [startTime, duration],
  );
  const [student, setStudent] = useLocalStorage<Student>("student", {
    id: "",
    personalInformation: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    variant: "0",
  });

  useUpdateAt(endTime, () => setSubmitted(true));

  const start = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setStudent((student) => ({
      ...student,
      variant: (import.meta.env.PROD ? Math.random() * Number.MAX_SAFE_INTEGER : 0).toString(),
    }));
  }, [setStartTime, setStudent]);

  const mockContest: Contest = {
    id: "id-finto",
    name: contestName,
    problemIds: range(questionCount ?? 0).map((i) => i.toString()),
    duration,
    personalInformation: [
      { name: "name", label: "Nome", type: "text" },
      { name: "surname", label: "Cognome", type: "text" },
    ],
    hasVariants: true,
    allowRestart: true,
  };

  const mockSchool: School = {
    id: "",
    schoolId: "",
    contestId: "",
    name: "Nessuna scuola",
    teacher: "",
    startingTime: startTime,
    finalized: false,
  };

  const reset = useCallback(() => {
    setSubmitted(false);
    setStudent((student) => ({
      ...student,
      answers: {},
    }));
    setStartTime(undefined);
  }, [setStudent, setStartTime, setSubmitted]);

  return (
    <StudentProvider
      contest={mockContest}
      school={mockSchool}
      student={student}
      setStudent={async (s) => setStudent(s)}
      submit={() => setSubmitted(true)}
      reset={reset}
      terminated={submitted}>
      {import.meta.env.PROD && !startTime ? (
        <div className="flex h-dvh justify-center">
          <div className="flex flex-col justify-center">
            <button className="btn btn-success btn-lg" onClick={start}>
              Inizia
            </button>
          </div>
        </div>
      ) : (
        children
      )}
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
