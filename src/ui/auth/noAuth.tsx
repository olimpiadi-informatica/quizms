import React, { ComponentType, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import dayjs, { Dayjs } from "dayjs";
import objectSupport from "dayjs/plugin/objectSupport";

import Progress from "../components/progress";
import Prose from "../components/prose";
import { AuthenticationProvider } from "./provider";

dayjs.extend(objectSupport);

type AuthProps = {
  header: ComponentType<Record<any, never>>;
  duration: object;
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
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({});
  const [startTime, setStartTime] = useState<Dayjs>();

  const endTime = useMemo(() => startTime?.add(duration), [startTime, duration]);

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

    const prevStartTime = localStorage.getItem("startTime");
    if (prevStartTime) {
      setStartTime(dayjs(prevStartTime));
    }

    const prevAnswers = localStorage.getItem("answers");
    if (prevAnswers) {
      setAnswers(JSON.parse(prevAnswers));
    }

    const prevSubmit = localStorage.getItem("submit");
    if (prevSubmit) {
      setSubmitted(true);
    }

    setLoaded(true);
  }, [loaded]);

  useEffect(() => {
    if (!endTime) return;
    const id = setTimeout(() => setSubmitted(true), endTime.diff(dayjs(), "millisecond"));
    return () => clearTimeout(id);
  }, [endTime]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("answers", JSON.stringify(answers));
  }, [loaded, answers]);

  const onStart = useCallback(() => {
    setStartTime(dayjs());
    localStorage.setItem("startTime", dayjs().toISOString());
  }, []);

  const submit = useCallback(() => {
    localStorage.setItem("submit", "1");
    setSubmitted(true);
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setAnswers({});
    setStartTime(undefined);
    localStorage.removeItem("startTime");
    localStorage.removeItem("answers");
    localStorage.removeItem("submit");
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-screen justify-center">
        <div className="flex flex-col justify-center">
          <Progress>Caricamento in corso...</Progress>
        </div>
      </div>
    );
  }

  if (!["pdf", "development"].includes(import.meta.env.QUIZMS_MODE) && !startTime) {
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
