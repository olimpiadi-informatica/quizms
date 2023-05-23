import React, { createContext, ReactNode, useContext } from "react";
import dayjs, { Dayjs } from "dayjs";

type AuthContextType = {
  answers: Record<string, string | undefined>;
  setAnswer: (name: string, value: string | undefined) => void;
  submit: () => void;
  startTime: Dayjs;
  endTime: Dayjs;
  variant: number;
  terminated: boolean;
};

const AuthenticationContext = createContext<AuthContextType>({
  answers: {},
  setAnswer: () => {},
  submit: () => {},
  startTime: dayjs(),
  endTime: dayjs(),
  variant: 0,
  terminated: false,
});
AuthenticationContext.displayName = "AuthenticationContext";

type AuthProviderProps = {
  /** Record con le risposte dell'utente */
  answers: Record<string, string | undefined>;
  /** Funzione per aggiornare le risposte */
  setAnswer: (name: string, value: string | undefined) => void;
  /** Funzione per terminare la prova e inviare le risposte */
  submit: () => void;
  /** Data e ora d'inizio prova */
  startTime: Dayjs;
  /** Data e ora di fine prova */
  endTime: Dayjs;
  /** Variante della prova assegnata all'utente */
  variant: number;
  /** Flag che indica se la prova è terminata */
  terminated: boolean;
  children: ReactNode;
};

export function AuthenticationProvider({
  variant,
  answers,
  setAnswer,
  submit,
  startTime,
  endTime,
  terminated,
  children,
}: AuthProviderProps) {
  return (
    <AuthenticationContext.Provider
      value={{ answers, setAnswer, submit, startTime, endTime, variant, terminated }}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication() {
  return useContext(AuthenticationContext);
}

type UseAnswerReturn = [string | undefined, (value: string | undefined) => void];

export function useAnswer(name: string): UseAnswerReturn {
  const { answers, setAnswer } = useContext(AuthenticationContext);
  return [
    answers[name],
    (value: string | undefined) => {
      setAnswer(name, value);
    },
  ];
}
