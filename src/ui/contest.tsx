import React, { ComponentType, createContext, ReactNode } from "react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuthentication } from "~/src/auth/provider";
import { Button } from "~/src/ui/components/button";
import Modal from "~/src/ui/components/modal";
import Timer from "~/src/ui/components/timer";
import ProgressBlock from "~/src/ui/components/progressBlock";
import classNames from "classnames";

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
  auth: ComponentType<Record<"children", ReactNode>>;
  header?: ComponentType;
  randomizeProblemOrder?: boolean;
  randomizeAnswerOrder?: boolean;
  children: ReactNode;
};

export function Contest({
  auth: Auth,
  header,
  randomizeProblemOrder,
  randomizeAnswerOrder,
  children,
}: ContestProps) {
  return (
    <Auth>
      <InnerContest
        header={header}
        randomizeProblemOrder={randomizeProblemOrder}
        randomizeAnswerOrder={randomizeAnswerOrder}>
        {children}
      </InnerContest>
    </Auth>
  );
}

function InnerContest({
  header: Header,
  randomizeProblemOrder,
  randomizeAnswerOrder,
  children,
}: Omit<ContestProps, "auth">) {
  const { answers, terminated } = useAuthentication();
  const [problems, setProblems] = useState<Record<string, Problem>>({});

  const registerProblem = useCallback((problem: Problem) => {
    setProblems((prev) => ({
      ...prev,
      [problem.id]: problem,
    }));
  }, []);

  const [score, maxScore, progress, sectionProgress] = useMemo(() => {
    let score: number | undefined = 0;
    let maxScore = 0;
    const total = [0, 0];
    const sections: Record<string, [number, number]> = {};
    for (const { id, section, correct, points } of Object.values(problems)) {
      if (!(section in sections)) sections[section] = [0, 0];
      if (id in answers && answers[id] !== undefined) {
        total[0] += points[0];
        sections[section][0] += points[0];
      }
      total[1] += points[0];
      sections[section][1] += points[0];
      maxScore += points[0];

      if (correct === undefined) {
        score = undefined;
      }
      if (score === undefined) {
        continue;
      }
      if (answers[id] === correct) {
        score += points[0];
      } else if (answers[id] === undefined) {
        score += points[1];
      } else {
        score += points[2];
      }
    }

    const progress = Math.round((total[0] / total[1]) * 100);
    const sectionProgress = Object.fromEntries(
      Object.entries(sections).map(([section, points]) => [
        section,
        Math.round((points[0] / points[1]) * 100),
      ])
    );
    return [score, maxScore, progress, sectionProgress];
  }, [answers, problems]);

  const [resultShown, setResultShown] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    if (terminated && !resultShown) {
      setResultShown(true);
      setModalOpen(true);
    }
  }, [terminated, resultShown]);

  return (
    <ContestContext.Provider
      value={{
        randomizeProblemOrder: randomizeProblemOrder ?? false,
        randomizeAnswerOrder: randomizeAnswerOrder ?? false,
        registerProblem,
      }}>
      <div className="prose prose-md dark:prose-invert lg:max-w-4xl px-4 mx-auto mt-5 mb-0">
        {Header && (
          <div className="header [page-break-after:always]">
            <Header />
            <hr />
          </div>
        )}
        <div className="contest">
          <main>{children}</main>
          <StickyFooter progress={progress} sectionProgress={sectionProgress} />
        </div>
      </div>
      <Modal
        title="Prova terminata"
        description="La prova è terminata."
        isOpen={isModalOpen}
        close={() => setModalOpen(false)}>
        {score !== undefined && (
          <p>
            Hai ottenuto un punteggio di <b>{score}</b> su <b>{maxScore}</b>.
          </p>
        )}
      </Modal>
    </ContestContext.Provider>
  );
}

type FooterProps = {
  progress: number;
  sectionProgress: Record<string, number>;
};

function StickyFooter({ progress, sectionProgress }: FooterProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const { startTime, endTime, terminated } = useAuthentication();

  return (
    <div
      className={classNames(
        "bg-white dark:bg-slate-800 border-t border-zinc-600 dark:border-slate-400",
        "flex justify-between p-3 overflow-hidden sticky bottom-0 print:hidden"
      )}>
      {terminated && (
        <ProgressBlock className="w-20" percentage={100}>
          0:00
        </ProgressBlock>
      )}
      {!terminated && <Timer startTime={startTime} endTime={endTime} />}
      <div className="hidden lg:flex flex-row gap-4">
        {Object.entries(sectionProgress).map(([id, val]) => (
          <ProgressBlock key={id} percentage={val}>
            Sezione {id}: {val}%
          </ProgressBlock>
        ))}
      </div>
      <ProgressBlock className="lg:hidden min-w-[5rem]" percentage={progress}>
        <span className="hidden xs:inline">Risposte date: </span>
        {progress}%
      </ProgressBlock>
      <Button
        className="text-white border-emerald-600 bg-emerald-600"
        onClick={() => setModalOpen(true)}
        disabled={terminated}>
        Termina
      </Button>
      <SubmitModal isOpen={isModalOpen} close={() => setModalOpen(false)} />
    </div>
  );
}

function SubmitModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const { submit } = useAuthentication();

  const confirm = () => {
    submit();
    close();
  };

  return (
    <Modal
      title="Confermi di voler terminare?"
      description="Confermando non potrai più modificare le tue risposte."
      isOpen={isOpen}
      close={close}>
      <div className="text-md flex flex-row justify-center gap-5">
        <Button className="border-black dark:border-slate-400 dark:bg-slate-600" onClick={close}>
          Annulla
        </Button>
        <Button className="text-white border-red-600 bg-red-600" onClick={confirm}>
          Conferma
        </Button>
      </div>
    </Modal>
  );
}

export function useContest() {
  return useContext(ContestContext);
}
