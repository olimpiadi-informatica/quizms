import React, { ReactNode, createContext, useContext } from "react";

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
};

const AuthenticationContext = createContext<AuthProviderProps>({
  answers: {},
  setAnswer: () => {},
  submit: () => {},
  startTime: new Date(),
  endTime: new Date(),
  variant: 0,
  terminated: false,
});
AuthenticationContext.displayName = "AuthenticationContext";

export function AuthenticationProvider({
  children,
  ...rest
}: AuthProviderProps & { children: ReactNode }) {
  return (
    <AuthenticationContext.Provider value={{ ...rest }}>{children}</AuthenticationContext.Provider>
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
