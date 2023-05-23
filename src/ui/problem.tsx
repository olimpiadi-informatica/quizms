import React, { ComponentType, useContext, createContext, ReactNode, useEffect } from "react";

import Katex from "react-katex";

import { useAnswer, useAuthentication } from "~/src/auth/provider";
import { AnswerGroup, Answer, OpenAnswer, Explanation } from "./answers";
import { useContest } from "~/src/ui/contest";
import { useSection } from "~/src/ui/section";

type StatementProps = {
  variant: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, ComponentType<any>>;
};

type ProblemProps = {
  id: string;
  points: [number, number, number];
  statement: ComponentType<StatementProps>;
};

type ProblemContextProps = {
  id?: string;
  points: [number, number, number];
};

const ProblemContext = createContext<ProblemContextProps>({
  id: undefined,
  points: [0, 0, 0],
});
ProblemContext.displayName = "ProblemContext";

export function Problem({ id, points, statement: Statement }: ProblemProps) {
  const { variant } = useAuthentication();

  return (
    <ProblemContext.Provider value={{ id, points }}>
      <Statement
        components={{ Math, SubProblem, AnswerGroup, Answer, OpenAnswer, Explanation }}
        variant={variant}
      />
      <hr className="last:hidden" />
    </ProblemContext.Provider>
  );
}

type SubProblemProps = {
  subId?: string;
  children: ReactNode;
};

export function SubProblem({ subId, children }: SubProblemProps) {
  const { id, points } = useContext(ProblemContext);
  const newId = subId ? `${id}.${subId}` : id!;

  const { registerProblem } = useContest();
  const section = useSection();

  useEffect(() => {
    registerProblem(newId, section, points);
  }, []);

  return (
    <ProblemContext.Provider value={{ id: newId, points }}>
      <h3>Problema {newId}</h3>
      {children}
    </ProblemContext.Provider>
  );
}

type UseAnswerReturn = [string | undefined, (value: string | undefined) => void];

export function useProblemAnswer(): UseAnswerReturn {
  const { id } = useContext(ProblemContext);
  return useAnswer(id!);
}

type MathProps = {
  display?: boolean;
  children: string;
};

function Math({ display, children }: MathProps) {
  if (display) {
    return <Katex.BlockMath math={children} />;
  } else {
    return <Katex.InlineMath math={children} />;
  }
}
