import React, {
  ComponentType,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import _ from "lodash";
import { BlockMath, InlineMath } from "react-katex";

import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import { useAuthentication } from "./auth/provider";
import Blockly from "./blockly/workspace";
import { useContest } from "./contest";
import { useSection } from "./section";

type StatementProps = {
  variant?: number;
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
  setCorrect: (value: string) => void;
};

const ProblemContext = createContext<ProblemContextProps>({
  id: undefined,
  points: [0, 0, 0],
  setCorrect: () => {},
});
ProblemContext.displayName = "ProblemContext";

export function Problem({ id, points, statement: Statement }: ProblemProps) {
  const { variant } = useAuthentication();

  return (
    <ProblemContext.Provider value={{ id, points, setCorrect: _.noop }}>
      <Statement
        components={{ Math, SubProblem, AnswerGroup, Answer, OpenAnswer, Explanation, Blockly }}
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
  const [correct, setCorrect] = useState<string>();

  useEffect(() => {
    registerProblem({ id: newId, section, correct, points });
  }, [registerProblem, newId, section, correct, points]);

  return (
    <ProblemContext.Provider value={{ id: newId, points, setCorrect }}>
      <div className="subproblem">
        <h3>Domanda {newId}</h3>
        {children}
      </div>
    </ProblemContext.Provider>
  );
}

export function useProblem() {
  return useContext(ProblemContext);
}

type MathProps = {
  display?: boolean;
  children: string;
};

function Math({ display, children }: MathProps) {
  if (display) {
    return <BlockMath math={children} />;
  } else {
    return <InlineMath math={children} />;
  }
}
