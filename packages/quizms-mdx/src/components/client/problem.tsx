"use client";

import { createContext, type ReactNode, use } from "react";

type ProblemContextProps = {
  id?: string;
};

export const ProblemContext = createContext<ProblemContextProps>({});
ProblemContext.displayName = "ProblemContext";

export function Problem({ children }: { children: ReactNode }) {
  const { id } = use(ProblemContext);
  return (
    <ProblemContext.Provider value={{ id }}>
      <div className="relative">{children}</div>
      <hr className="last:hidden" />
    </ProblemContext.Provider>
  );
}

export type SubProblemProps = {
  subId: number;
  children: ReactNode;
};

export function SubProblem({ subId, children }: SubProblemProps) {
  const { id } = use(ProblemContext);
  const newId = subId ? `${id}.${subId}` : `${id}`;

  return (
    <ProblemContext.Provider value={{ id: newId }}>
      <div className="break-inside-avoid">
        <h3>Domanda {newId}</h3>
        {children}
      </div>
    </ProblemContext.Provider>
  );
}

export function useProblem() {
  return use(ProblemContext);
}
