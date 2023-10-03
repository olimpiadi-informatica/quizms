import React, { ReactNode, createContext, useContext } from "react";

import { MDXProvider } from "@mdx-js/react";

import { components } from "../mdxComponents";

type AuthProviderProps = {
  /** Record con le risposte dell'utente */
  answers: Record<string, string | undefined>;
  /** Funzione per aggiornare le risposte */
  setAnswer: (name: string, value: string | undefined) => void;
  /** Funzione per terminare la prova e inviare le risposte */
  submit: () => void;
  /** Funzione per resettare le risposte e ricominciare la prova (opzionale) */
  reset?: () => void;
  /** Data e ora d'inizio prova (opzionale) */
  startTime?: Date;
  /** Data e ora di fine prova (opzionale) */
  endTime?: Date;
  /** Variante della prova assegnata all'utente (opzionale) */
  variant?: number;
  /** Flag che indica se la prova è terminata */
  terminated: boolean;
  children: ReactNode;
};

const AuthenticationContext = createContext<Omit<AuthProviderProps, "children">>({
  answers: {},
  setAnswer: () => {},
  submit: () => {},
  startTime: new Date(),
  endTime: new Date(),
  variant: 0,
  terminated: false,
});
AuthenticationContext.displayName = "AuthenticationContext";

export function AuthenticationProvider({ children, ...rest }: AuthProviderProps) {
  return (
    <AuthenticationContext.Provider value={{ ...rest }}>
      <MDXProvider components={components}>{children}</MDXProvider>
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication() {
  return useContext(AuthenticationContext);
}

type UseAnswerReturn = [string | undefined, (value: string | undefined) => void];

export function useAnswer(name: string): UseAnswerReturn {
  const { answers, setAnswer } = useContext(AuthenticationContext);
  return [answers[name], (value: string | undefined) => setAnswer(name, value)];
}
