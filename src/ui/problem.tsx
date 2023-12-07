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

import { hash } from "~/utils/random";

import { useContest } from "./contest";
import { useStudent } from "./student/provider";

type StatementProps = {
  variant?: (id: number) => number;
};

type ProblemProps = {
  index: number;
  points: [number, number, number];
  statement: ComponentType<StatementProps>;
};

type ProblemContextProps = {
  id?: string;
  index?: string | number;
  points: [number, number, number];
  setCorrect: (value: string) => void;
};

const ProblemContext = createContext<ProblemContextProps>({
  id: undefined,
  index: undefined,
  points: [0, 0, 0],
  setCorrect: () => {},
});
ProblemContext.displayName = "ProblemContext";

export function Problem({ index, points, statement: Statement }: ProblemProps) {
  const { variant } = useStudent();

  const variantId = useMemo(
    () => (import.meta.env.PROD && variant ? hash(`r#problem#${variant}#${index}`) : 0),
    [variant, index],
  );

  return (
    <ProblemContext.Provider value={{ index, points, setCorrect: noop }}>
      <Statement variant={() => variantId} />
      <hr className="last:hidden" />
    </ProblemContext.Provider>
  );
}

type SubProblemProps = {
  id: string;
  subIndex: number;
  children: ReactNode;
};

export function SubProblem({ id, subIndex, children }: SubProblemProps) {
  const { index, points } = useContext(ProblemContext);
  const newIndex = subIndex ? `${index}.${subIndex}` : `${index}`;

  const { registerProblem } = useContest();
  const [correct, setCorrect] = useState<string>();

  useEffect(() => {
    registerProblem({ id: newIndex, correct, points });
  }, [registerProblem, newIndex, correct, points]);

  return (
    <ProblemContext.Provider value={{ id, index: newIndex, points, setCorrect }}>
      <div className="subproblem break-inside-avoid">
        <h3>Domanda {newIndex}</h3>
        {children}
      </div>
    </ProblemContext.Provider>
  );
}

export function useProblem() {
  return useContext(ProblemContext);
}
