import React, { ComponentType, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Duration, add, differenceInMilliseconds } from "date-fns";

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

function NoAuthInner({ duration, children }: Omit<AuthProps, "header">) {
  const path = window.location.pathname;

  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({});
  const [startTime, setStartTime] = useState<Date>();

  const endTime = useMemo(() => startTime && add(startTime, duration), [startTime, duration]);

  const setAnswer = useCallback(
    (name: string, value: string | undefined) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [name]: value }));
    },
    [submitted],
  );

  const [loaded, setLoaded] = useState(import.meta.env.QUIZMS_MODE === "pdf");
  useEffect(() => {
    if (loaded) return;

    const prevStartTime = localStorage.getItem(path + "#startTime");
    if (prevStartTime) {
      setStartTime(new Date(prevStartTime));
    }

    const prevAnswers = localStorage.getItem(path + "#answers");
    if (prevAnswers) {
      setAnswers(JSON.parse(prevAnswers));
    }

    const prevSubmit = localStorage.getItem(path + "#submit");
    if (prevSubmit) {
      setSubmitted(true);
    }

    setLoaded(true);
  }, [path, loaded]);

  useEffect(() => {
    if (!endTime) return;
    const id = setTimeout(() => setSubmitted(true), differenceInMilliseconds(endTime, new Date()));
    return () => clearTimeout(id);
  }, [endTime]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(path + "#answers", JSON.stringify(answers));
  }, [path, loaded, answers]);

  const onStart = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    localStorage.setItem(path + "#startTime", now.toISOString());
  }, [path]);

  const submit = useCallback(() => {
    localStorage.setItem(path + "#submit", "1");
    setSubmitted(true);
  }, [path]);

  const reset = useCallback(() => {
    setSubmitted(false);
    setAnswers({});
    setStartTime(undefined);
    localStorage.removeItem(path + "#startTime");
    localStorage.removeItem(path + "#answers");
    localStorage.removeItem(path + "#submit");
  }, [path]);

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
          <button className="btn btn-success btn-lg" onClick={onStart}>
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
      submit={submit}
      reset={reset}
      startTime={startTime}
      endTime={endTime!}
      variant={0}
      terminated={submitted}>
      {children}
    </AuthenticationProvider>
  );
}
