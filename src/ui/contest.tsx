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

import _ from "lodash";

import { useAuthentication } from "@/auth/provider";
import Modal from "@/ui/components/modal";
import Progress from "@/ui/components/progress";
import Timer from "@/ui/components/timer";

type Problem = {
  id: string;
  section: string;
  correct: string | undefined;
  points: [number, number, number];
};

type ContestContextProps = {
  randomizeProblemOrder: boolean;
  randomizeAnswerOrder: boolean;
  registerProblem: (problem: Problem) => void;
};

const ContestContext = createContext<ContestContextProps>({
  randomizeProblemOrder: false,
  randomizeAnswerOrder: false,
  registerProblem: () => {},
});
ContestContext.displayName = "ContestContext";

type ContestProps = {
  randomizeProblemOrder?: boolean;
  randomizeAnswerOrder?: boolean;
  children: ReactNode;
};

export function Contest({ randomizeProblemOrder, randomizeAnswerOrder, children }: ContestProps) {
  const { answers, terminated } = useAuthentication();
  const [problems, setProblems] = useState<Record<string, Problem>>({});

  const registerProblem = useCallback((problem: Problem) => {
    setProblems((prev) => ({
      ...prev,
      [problem.id]: problem,
    }));
  }, []);

  const progress = useMemo(() => {
    const total = _(problems).values().sumBy("points[0]");
    const user = _(problems)
      .filter(({ id }) => id in answers)
      .sumBy("points[0]");
    return Math.round((user / total) * 100);
  }, [answers, problems]);

  const [resultShown, setResultShown] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (terminated && !resultShown) {
      setResultShown(true);
      ref.current?.showModal();
    }
  }, [terminated, resultShown]);

  return (
    <ContestContext.Provider
      value={{
        randomizeProblemOrder: randomizeProblemOrder ?? false,
        randomizeAnswerOrder: randomizeAnswerOrder ?? false,
        registerProblem,
      }}>
      <div className="contest break-before-page">
        <main>{children}</main>
        <StickyFooter progress={progress} />
      </div>
      <CompletedModal ref={ref} problems={problems} answers={answers} />
    </ContestContext.Provider>
  );
}

type ModalProps = {
  ref: Ref<HTMLDialogElement>;
  problems: Record<string, Problem>;
  answers: Record<string, string | undefined>;
};

const CompletedModal = forwardRef(function CompletedModal(
  { problems, answers }: ModalProps,
  ref: Ref<HTMLDialogElement>,
) {
  const calcPoints = useCallback(
    (problem: Problem) => {
      if (answers[problem.id] === undefined) return problem.points[1];
      if (answers[problem.id] === problem.correct) return problem.points[0];
      return problem.points[2];
    },
    [answers],
  );

  const score = useMemo(() => {
    if (_(problems).map("correct").some(_.isNil)) return undefined;
    return _(problems).values().sumBy(calcPoints);
  }, [problems, calcPoints]);

  const maxScore = useMemo(() => {
    return _(problems).values().sumBy("points[0]");
  }, [problems]);

  return (
    <Modal ref={ref} title="Prova terminata">
      {score !== undefined && (
        <>
          <p>La prova è terminata.</p>
          <p>
            Hai ottenuto un punteggio di <b>{score}</b> su <b>{maxScore}</b>.
          </p>
          <table className="text-center">
            <thead>
              <tr>
                <th>Domanda</th>
                <th>Risposta</th>
                <th>Soluzione</th>
                <th>Punteggio</th>
              </tr>
            </thead>
            <tbody>
              {_(problems)
                .values()
                .sortBy("id")
                .map((problem) => (
                  <tr key={problem.id}>
                    <th>{problem.id}</th>
                    <th>{answers[problem.id] ?? "-"}</th>
                    <th>{problem.correct}</th>
                    <th>{calcPoints(problem)}</th>
                  </tr>
                ))
                .value()}
            </tbody>
          </table>
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
  const { startTime, endTime, terminated } = useAuthentication();

  return (
    <div className="sticky bottom-0 z-[100] border-t border-base-content print:hidden">
      <div className="relative">
        <div className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-base-100" />
        <div className="flex justify-between p-3">
          {terminated && (
            <Progress className="w-20" percentage={100}>
              <span className="font-mono">00:00</span>
            </Progress>
          )}
          {!terminated && <Timer startTime={startTime} endTime={endTime} />}
          <Progress className="min-w-[5rem]" percentage={progress}>
            <span className="hidden xs:inline">Risposte date: </span>
            {progress}%
          </Progress>
          <button
            className="btn btn-success"
            onClick={() => ref.current?.showModal()}
            disabled={terminated}>
            Termina
          </button>
        </div>
      </div>
      <SubmitModal ref={ref} />
    </div>
  );
}

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { submit } = useAuthentication();

  const close = useCallback(() => {
    if (ref && "current" in ref && ref.current) ref.current.close();
  }, [ref]);

  const confirm = useCallback(() => {
    submit();
    close();
  }, [submit, close]);

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <div className="text-md flex flex-row justify-center gap-5">
        <button className="btn btn-neutral btn-outline" onClick={close}>
          Annulla
        </button>
        <button className="btn btn-error" onClick={confirm}>
          Conferma
        </button>
      </div>
    </Modal>
  );
});

export function useContest() {
  return useContext(ContestContext);
}
