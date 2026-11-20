"use client";

import { createContext, type ReactNode, use } from "react";

import { useStatementLanguageContext } from "@olinfo/quizms/student";
import { statementString } from "@olinfo/quizms/utils";

type ProblemContextProps = {
  id?: string;
};

const ProblemContext = createContext<ProblemContextProps>({});
ProblemContext.displayName = "ProblemContext";

export function ProblemProvider({ children, id }: { children: ReactNode; id: string }) {
  return <ProblemContext.Provider value={{ id }}>{children}</ProblemContext.Provider>;
}
ProblemProvider.displayName = "ProblemProvider";

export function Problem({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="relative">{children}</div>
      <hr className="last:hidden" />
    </>
  );
}
Problem.displayName = "Problem";

export function SubProblem({ subId, children }: { subId: number; children: ReactNode }) {
  const { id } = use(ProblemContext);
  const language = useStatementLanguageContext();
  const newId = subId ? `${id}.${subId}` : `${id}`;

  return (
    <ProblemProvider id={newId}>
      <div className="break-inside-avoid">
        <h3>
          {statementString(language, "question")} {newId}
        </h3>
        {children}
      </div>
    </ProblemProvider>
  );
}
Problem.displayName = "Problem";

export function useProblem() {
  return use(ProblemContext);
}
