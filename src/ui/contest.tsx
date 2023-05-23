import React, { ComponentType, createContext, ReactNode } from "react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import _ from "lodash";

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

  const score = useMemo(() => {
    if (_(problems).values().map("correct").some(_.isNull)) return undefined;
    return _(problems)
      .values()
      .sumBy(({ id, correct, points }) => {
        if (answers[id] === undefined) return points[1];
        if (answers[id] === correct) return points[0];
        return points[2];
      });
  }, [answers, problems]);

  const maxScore = useMemo(() => {
    return _(problems).values().sumBy("points[0]");
  }, [problems]);

  const progress = useMemo(() => {
    const total = _.sumBy(_.values(problems), "points[0]");
    const user = _(problems)
      .filter(({ id }) => id in answers)
      .sumBy("points[0]");
    return Math.round((user / total) * 100);
  }, [answers, problems]);

  const sectionProgress = useMemo(() => {
    return _(problems)
      .values()
      .groupBy("section")
      .mapValues((section) => {
        const total = _.sumBy(section, "points[0]");
        const user = _(section)
          .filter(({ id }) => id in answers)
          .sumBy("points[0]");
        return Math.round((user / total) * 100);
      })
      .value();
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
        {_.map(sectionProgress, (val, id) => (
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
