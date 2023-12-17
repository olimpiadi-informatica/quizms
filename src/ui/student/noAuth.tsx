import React, {
  ComponentType,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

import { addMinutes } from "date-fns";
import { isFunction, range } from "lodash-es";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student } from "~/models/student";
import { useUpdateAt } from "~/ui/components/time";

import { Layout } from "./layout";
import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  questionCount?: number;
  children: ReactNode;

  // Da rimuovere
  header: ComponentType<any>;
};

export function NoAuth({
  header: Header,
  contestName,
  duration,
  questionCount,
  children,
}: AuthProps) {
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
    allowStudentRegistration: false,
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
