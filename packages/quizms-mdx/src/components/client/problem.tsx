"use client";

import { createContext, type ReactNode, use } from "react";

export type ProblemProps = {
  points: [number, number, number];
  children: ReactNode;
};

type ProblemContextProps = {
  id?: string | number;
  points: [number, number, number];
};

export const ProblemContext = createContext<ProblemContextProps>({
  id: undefined,
  points: [0, 0, 0],
});
ProblemContext.displayName = "ProblemContext";

export function ProblemClient({ points, children }: ProblemProps) {
  const { id } = use(ProblemContext);
  return (
    <ProblemContext.Provider value={{ id, points }}>
      <div className="relative">{children}</div>
      <hr className="last:hidden" />
    </ProblemContext.Provider>
  );
}

export type SubProblemProps = {
  subId: number;
  children: ReactNode;
};

export function SubProblemClient({ subId, children }: SubProblemProps) {
  const { id, points } = use(ProblemContext);
  const newId = subId ? `${id}.${subId}` : `${id}`;

  return (
    <ProblemContext.Provider value={{ id: newId, points }}>
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
