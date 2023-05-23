import React, { ReactNode, useEffect, useState } from "react";
import dayjs from "dayjs";

import { AuthenticationProvider } from "./provider";

export function NoAuth({ children }: { children: ReactNode }) {
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({});
  const [startTime] = useState(dayjs());
  const endTime = startTime.add(45, "minutes");

  const setAnswer = (name: string, value: string | undefined) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const prevAnswers = localStorage.getItem("answers");
    if (prevAnswers) {
      setAnswers(JSON.parse(prevAnswers));
    }
    setLoaded(true);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("answers", JSON.stringify(answers));
  }, [loaded, answers]);

  return (
    <AuthenticationProvider
      answers={answers}
      setAnswer={setAnswer}
      submit={() => setSubmitted(true)}
      startTime={startTime}
      endTime={endTime}
      variant={0}
      terminated={submitted}>
      {children}
    </AuthenticationProvider>
  );
}
