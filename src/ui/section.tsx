import React, { ReactNode, Children, createContext, useContext } from "react";

import { useContest } from "./contest";

type SectionProps = {
  id?: string;
  children: ReactNode;
};

const SectionContext = createContext<string>("0");
SectionContext.displayName = "SectionContext";

export function Section({ id, children }: SectionProps) {
  const contest = useContest();

  const problems = Children.toArray(children);
  if (contest.randomizeProblemOrder) {
    // TODO
  }

  return (
    <SectionContext.Provider value={id ?? "0"}>
      <div className="section">{problems}</div>
      <hr className="last:hidden [page-break-after:always]" />
    </SectionContext.Provider>
  );
}

export function useSection() {
  return useContext(SectionContext);
}
