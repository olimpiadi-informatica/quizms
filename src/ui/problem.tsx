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

import { useAuthentication } from "./auth/provider";
import { useContest } from "./contest";
import { useSection } from "./section";

type StatementProps = {
  variant?: number;
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

  const variantId = useMemo(
    () => (import.meta.env.PROD && variant ? hash(`r#problem#${variant}#${id}`) : 0),
    [variant, id],
  );

  return (
    <ProblemContext.Provider value={{ id, points, setCorrect: noop }}>
      <Statement variant={variantId} />
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
