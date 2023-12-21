import React, {
  ComponentType,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { noop } from "lodash-es";

import { useStudent } from "~/core/student/provider";
import { hash } from "~/utils/random";

import { useContest } from "./contest";

type StatementProps = {
  variant?: (id: number) => number;
};

type ProblemProps = {
  id: number;
  points: [number, number, number];
  statement: ComponentType<StatementProps>;
};

type ProblemContextProps = {
  id?: string | number;
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
  const { student } = useStudent();

  const variantId = useMemo(
    () =>
      import.meta.env.QUIZMS_MODE === "training" && student.variant
        ? hash(`r#problem#${student.variant}#${id}`)
        : 0,
    [student.variant, id],
  );

  return (
    <ProblemContext.Provider value={{ id, points, setCorrect: noop }}>
      <Statement variant={() => variantId} />
      <hr className="last:hidden" />
    </ProblemContext.Provider>
  );
}

type SubProblemProps = {
  subId: number;
  children: ReactNode;
};

export function SubProblem({ subId, children }: SubProblemProps) {
  const { id, points } = useContext(ProblemContext);
  const newId = subId ? `${id}.${subId}` : `${id}`;

  const { registerProblem } = useContest();
  const [correct, setCorrect] = useState<string>();

  useEffect(() => {
    registerProblem({ id: newId, correct, points });
  }, [registerProblem, newId, correct, points]);

  return (
    <ProblemContext.Provider value={{ id: newId, points, setCorrect }}>
      <div className="subproblem break-inside-avoid">
        <h3>Domanda {newId}</h3>
        {children}
      </div>
    </ProblemContext.Provider>
  );
}

export function useProblem() {
  return useContext(ProblemContext);
}
