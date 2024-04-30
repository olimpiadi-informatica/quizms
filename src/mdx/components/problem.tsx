import {
  ComponentType,
  ReactNode,
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { defer, range } from "lodash-es";

import { hash } from "~/utils/random";
import { useStudent } from "~/web/student/provider";

type StatementProps = {
  variant: () => number;
  setVariantCount: (count: number) => void;
};

type ProblemProps = {
  id: number;
  points: [number, number, number];
  statement: ComponentType<StatementProps>;
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

export function Problem({ id, points, statement }: ProblemProps) {
  const { student } = useStudent();

  const [variantCount, setVariantCount] = useState(1);
  const [variant, setVariant] = useState(() =>
    import.meta.env.QUIZMS_MODE === "training" && student.variant
      ? hash(`r#problem#${student.variant}#${id}`)
      : 0,
  );

  const getVariant = useCallback(() => variant, [variant]);
  const setVariantCountOnce = useCallback(
    (count: number) => {
      if (count && count !== variantCount) {
        defer(() => setVariantCount(count));
      }
    },
    [variantCount],
  );

  const Statement = useMemo(() => memo(statement), [statement]);

  return (
    <ProblemContext.Provider value={{ id, points }}>
      <div className="relative">
        {import.meta.env.DEV && (
          <div className="absolute right-0 top-0 print:hidden">
            <select
              className="select select-ghost"
              value={variant}
              onChange={(e) => setVariant(+e.target.value)}>
              {range(variantCount).map((v) => (
                <option key={v} value={v}>
                  Variante {v + 1}
                </option>
              ))}
            </select>
          </div>
        )}
        <Statement variant={getVariant} setVariantCount={setVariantCountOnce} />
      </div>
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
  return useContext(ProblemContext);
}
