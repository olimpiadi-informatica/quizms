import React, {
  ReactNode,
  Ref,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { isNil, sumBy } from "lodash-es";

import Modal from "~/core/components/modal";
import { useStudent } from "~/core/student/provider";
import { randomId } from "~/utils/random";

type Problem = {
  id: string;
  correct: string | undefined;
  points: [number, number, number];
};

type ContestContextProps = {
  registerProblem: (problem: Problem) => void;
};

const ContestContext = createContext<ContestContextProps>({
  registerProblem: () => {},
});
ContestContext.displayName = "ContestContext";

export function Contest({ children }: { children: ReactNode }) {
  const { student, setStudent, terminated } = useStudent();
  const [problems, setProblems] = useState<Record<string, Problem>>({});

  const registerProblem = useCallback((problem: Problem) => {
    setProblems((prev) => ({
      ...prev,
      [problem.id]: problem,
    }));
  }, []);

  const [resultShown, setResultShown] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (terminated && !resultShown) {
      setResultShown(true);
      ref.current?.showModal();
    }
  }, [terminated, resultShown]);

  if (import.meta.env.QUIZMS_MODE === "training" && !student.startedAt) {
    const start = () => {
      void setStudent({
        ...student,
        startedAt: new Date(),
        variant: import.meta.env.PROD ? randomId() : "",
      });
    };

    return (
      <div className="flex h-[50vh] justify-center">
        <div className="flex flex-col justify-center">
          <button className="btn btn-success btn-lg" onClick={start}>
            Inizia
          </button>
        </div>
      </div>
    );
  }

  return (
    <ContestContext.Provider value={{ registerProblem }}>
      <div className="contest break-before-page">
        <main className="gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
          {children}
        </main>
      </div>
      <CompletedModal ref={ref} problems={problems} />
    </ContestContext.Provider>
  );
}

const CompletedModal = forwardRef(function CompletedModal(
  { problems }: { problems: Record<string, Problem> },
  ref: Ref<HTMLDialogElement>,
) {
  const { student } = useStudent();

  const sortedProblems = Object.values(problems);
  sortedProblems.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const calcPoints = useCallback(
    (problem: Problem) => {
      if (student.answers?.[problem.id] === undefined) return problem.points[1];
      if (student.answers[problem.id] === problem.correct) return problem.points[0];
      return problem.points[2];
    },
    [student.answers],
  );

  const score = useMemo(() => {
    if (
      Object.values(problems)
        .map((p) => p.correct)
        .some(isNil)
    ) {
      return undefined;
    }
    return sumBy(Object.values(problems), calcPoints);
  }, [problems, calcPoints]);

  const maxScore = useMemo(() => {
    return sumBy(Object.values(problems), "points[0]");
  }, [problems]);

  return (
    <Modal ref={ref} title="Prova terminata">
      {score !== undefined && (
        <>
          <p>La prova è terminata.</p>
          <p>
            Hai ottenuto un punteggio di <b>{score}</b> su <b>{maxScore}</b>.
          </p>
          <div className="w-full">
            <table className="table-fixed prose-td:truncate">
              <thead>
                <tr>
                  <th scope="col">Domanda</th>
                  <th scope="col">Risposta</th>
                  <th scope="col">Soluzione</th>
                  <th scope="col">Punteggio</th>
                </tr>
              </thead>
              <tbody>
                {sortedProblems.map((problem) => (
                  <tr key={problem.id}>
                    <td>{problem.id}</td>
                    <td>{student.answers?.[problem.id] ?? "-"}</td>
                    <td>{problem.correct}</td>
                    <td>{calcPoints(problem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
});

export function useContest() {
  return useContext(ContestContext);
}
