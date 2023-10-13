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

function useLocalStorage<T>(key: string, defaultValue: T, parser?: (value: string) => T) {
  const fullKey = `${window.location.pathname}#${key}`;
  const prev = localStorage.getItem(fullKey);

  const [value, setValue] = useState<T>(prev ? (parser ?? JSON.parse)(prev) : defaultValue);

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

  return [value, set] as const;
}

function NoAuthInner({ duration, children }: Omit<AuthProps, "header">) {
  const [variant, setVariant] = useLocalStorage("variant", 0);
  const [submitted, setSubmitted] = useLocalStorage("submit", false);

  const [startTime, setStartTime] = useLocalStorage<Date | undefined>(
    "startTime",
    undefined,
    (value) => (value !== "undefined" ? new Date(JSON.parse(value)) : undefined),
  );
  const endTime = useMemo(() => startTime && add(startTime, duration), [startTime, duration]);

  const [answers, setAnswers] = useLocalStorage<Record<string, string | undefined>>("answers", {});

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
