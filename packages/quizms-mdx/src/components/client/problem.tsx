"use client";

import { createContext, type ReactNode, useContext } from "react";

export type ProblemProps = {
  id: number;
  points: [number, number, number];
  children: ReactNode;
};

type ProblemContextProps = {
  id?: string | number;
  points: [number, number, number];
};

const ProblemContext = createContext<ProblemContextProps>({
  id: undefined,
  points: [0, 0, 0],
});
ProblemContext.displayName = "ProblemContext";

export function ProblemClient({ id, points, children }: ProblemProps) {
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
  const { id, points } = useContext(ProblemContext);
  const newId = subId ? `${id}.${subId}` : `${id}`;

  return (
    <ProblemContext.Provider value={{ id: newId, points }}>
      <div className="break-inside-avoid">
        <h3>Question {newId}</h3>
        {children}
      </div>
    </ProblemContext.Provider>
  );
}

export function useProblem() {
  return useContext(ProblemContext);
}
