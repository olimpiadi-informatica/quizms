import React, {
  ComponentType,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { add, differenceInMilliseconds } from "date-fns";
import { isFunction } from "lodash-es";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student } from "~/models/student";

import { Layout } from "./layout";
import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  children: ReactNode;

  // Da rimuovere
  header: ComponentType<any>;
};

export function NoAuth({ header: Header, contestName, duration, children }: AuthProps) {
  const [variant, setVariant] = useLocalStorage("variant", 0);
  const [submitted, setSubmitted] = useLocalStorage("submit", false);

  const [startTime, setStartTime] = useLocalStorage<Date | undefined>(
    "startTime",
    undefined,
    (value) => (value !== "undefined" ? new Date(JSON.parse(value)) : undefined),
  );
  const endTime = useMemo(
    () => startTime && add(startTime, { minutes: duration }),
    [startTime, duration],
  );

  useEffect(() => {
    if (!endTime) return;
    const id = setTimeout(() => setSubmitted(true), differenceInMilliseconds(endTime, new Date()));
    return () => clearTimeout(id);
  }, [endTime, setSubmitted]);

  const start = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setVariant(import.meta.env.PROD ? Math.random() * Number.MAX_SAFE_INTEGER : 0);
  }, [setStartTime, setVariant]);

  const mockContest: Contest = {
    id: "",
    name: contestName,
    questionCount: 0,
    duration,
    personalInformation: [
      { name: "name", label: "Nome", type: "text" },
      { name: "surname", label: "Cognome", type: "text" },
    ],
    hasVariants: true,
    allowStudentRegistration: false,
    allowRestart: true,
  };

  const mockSchool: School = {
    id: "",
    name: "Nessuna scuola",
    teacher: "",
    startingTime: startTime,
    finalized: false,
  };

  const [student, setStudent] = useState<Student>({
    id: "",
    personalInformation: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
  });

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
      variant={variant}
      submit={() => setSubmitted(true)}
      reset={reset}
      terminated={submitted}>
      <Layout>
        <Header />
        {import.meta.env.PROD && !startTime ? (
          <div className="flex h-screen justify-center">
            <div className="flex flex-col justify-center">
              <button className="btn btn-success btn-lg" onClick={start}>
                Inizia
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </Layout>
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