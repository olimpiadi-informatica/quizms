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

import { add } from "date-fns";
import { isNil, sortBy, sumBy } from "lodash-es";

import Modal from "./components/modal";
import Progress from "./components/progress";
import Timer from "./components/timer";
import { useStudent } from "./student/provider";

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
  const { student, terminated } = useStudent();
  const [problems, setProblems] = useState<Record<string, Problem>>({});

  const registerProblem = useCallback((problem: Problem) => {
    setProblems((prev) => ({
      ...prev,
      [problem.id]: problem,
    }));
  }, []);

  const progress = Math.round(
    (sumBy(Object.values(student.answers ?? {}), (s) => Number(!!s)) /
      Object.values(problems).length) *
      100,
  );

  const [resultShown, setResultShown] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (terminated && !resultShown) {
      setResultShown(true);
      ref.current?.showModal();
    }
  }, [terminated, resultShown]);

  return (
    <ContestContext.Provider value={{ registerProblem }}>
      <div className="contest break-before-page">
        <main>{children}</main>
        <StickyFooter progress={progress} />
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

type FooterProps = {
  progress: number;
};

function StickyFooter({ progress }: FooterProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { contest, school, reset, terminated } = useStudent();

  const endingTime = useMemo(
    () => school.startingTime && add(school.startingTime, { minutes: contest.duration }),
    [school.startingTime, contest.duration],
  );

  return (
    <div className="sticky bottom-0 z-[100] border-t border-base-content print:hidden">
      <div className="relative">
        <div className="absolute inset-y-0 left-1/2 -z-10 w-[max(calc(100vw-2rem),360px)] -translate-x-1/2 bg-base-100" />
        <div className="flex justify-between p-3">
          {terminated && (
            <Progress className="w-20" percentage={100}>
              <span className="font-mono">00:00</span>
            </Progress>
          )}
          {!terminated && <Timer startTime={school.startingTime} endTime={endingTime} />}
          <Progress className="min-w-[5rem]" percentage={progress}>
            <span className="hidden xs:inline">Risposte date: </span>
            {progress}%
          </Progress>
          {terminated && reset ? (
            <button className="btn btn-warning" onClick={reset}>
              Ricomincia
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => ref.current?.showModal()}
              disabled={terminated}>
              Termina
            </button>
          )}
        </div>
      </div>
      <SubmitModal ref={ref} />
    </div>
  );
}

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { submit } = useStudent();

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <div className="text-md flex flex-row justify-center gap-5">
        <button className="btn btn-outline btn-neutral" onClick={close}>
          Annulla
        </button>
        <button className="btn btn-error" /* TODO onClick={} */>Conferma</button>
      </div>
    </Modal>
  );
});

export function useContest() {
  return useContext(ContestContext);
}
