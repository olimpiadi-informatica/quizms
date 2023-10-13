import React, {
  ComponentType,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Duration, add, differenceInMilliseconds } from "date-fns";
import _ from "lodash";

import Progress from "../components/progress";
import Prose from "../components/prose";
import { AuthenticationProvider } from "./provider";

type AuthProps = {
  header: ComponentType<Record<any, never>>;
  duration: Duration;
  children: ReactNode;
};

export function NoAuth({ header: Header, children, ...rest }: AuthProps) {
  return (
    <Prose>
      <Header />
      <NoAuthInner {...rest}>{children}</NoAuthInner>
    </Prose>
  );
}

function useLocalStorage<T>(
  prefix: string,
  key: string,
  defaultValue: T,
  parser?: (value: string) => T,
) {
  const [value, setValue] = useState<T>(defaultValue);

  const fullKey = `${prefix}#${key}`;

  const set = useCallback(
    (value: SetStateAction<T>) => {
      setValue((oldValue) => {
        const newValue = _.isFunction(value) ? value(oldValue) : value;
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

  useEffect(() => {
    const prev = localStorage.getItem(fullKey);
    if (prev) set((parser ?? JSON.parse)(prev));
  }, [fullKey, parser, set]);

  return [value, set] as const;
}

function NoAuthInner({ duration, children }: Omit<AuthProps, "header">) {
  const [path, setPath] = useState("");
  const [loaded, setLoaded] = useState(import.meta.env.QUIZMS_MODE === "pdf");

  useEffect(() => {
    setPath(window.location.pathname);
    setLoaded(true);
  }, []);

  const [variant, setVariant] = useLocalStorage(path, "variant", 0);
  const [submitted, setSubmitted] = useLocalStorage(path, "submit", false);

  const [startTime, setStartTime] = useLocalStorage<Date | undefined>(
    path,
    "startTime",
    undefined,
    (value) => (value !== "undefined" ? new Date(value) : undefined),
  );
  const endTime = useMemo(() => startTime && add(startTime, duration), [startTime, duration]);

  const [answers, setAnswers] = useLocalStorage<Record<string, string | undefined>>(
    path,
    "answers",
    {},
  );

  const setAnswer = useCallback(
    (name: string, value: string | undefined) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [name]: value }));
    },
    [submitted, setAnswers],
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

  const reset = useCallback(() => {
    setSubmitted(false);
    setAnswers({});
    setStartTime(undefined);
  }, [setAnswers, setStartTime, setSubmitted]);

  if (!loaded) {
    return (
      <div className="flex h-screen justify-center">
        <div className="flex flex-col justify-center">
          <Progress>Caricamento in corso...</Progress>
        </div>
      </div>
    );
  }

  if (import.meta.env.PROD && import.meta.env.QUIZMS_MODE !== "pdf" && !startTime) {
    return (
      <div className="flex h-screen justify-center">
        <div className="flex flex-col justify-center">
          <button className="btn btn-success btn-lg" onClick={start}>
            Inizia
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticationProvider
      answers={answers}
      setAnswer={setAnswer}
      submit={() => setSubmitted(true)}
      reset={reset}
      startTime={startTime}
      endTime={endTime!}
      variant={variant}
      terminated={submitted}>
      {children}
    </AuthenticationProvider>
  );
}
