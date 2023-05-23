import React, {
  ComponentType,
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import { useAuthentication } from "~/src/auth/provider";
import { Button } from "~/src/ui/components/button";
import Modal from "~/src/ui/components/modal";
import Timer from "~/src/ui/components/timer";
import ProgressBlock from "~/src/ui/components/progressBlock";

type ContestContextProps = {
  randomizeProblemOrder: boolean;
  randomizeAnswerOrder: boolean;
  registerProblem: (id: string, section: string, points: [number, number, number]) => void;
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
  const { answers } = useAuthentication();
  const [problems, setProblems] = useState<Record<string, [string, [number, number, number]]>>({});

  const registerProblem = (id: string, section: string, points: [number, number, number]) => {
    if (id in problems) return;
    setProblems((prev) => ({ ...prev, [id]: [section, points] }));
  };

  const [progress, sectionProgress] = useMemo(() => {
    let total = [0, 0];
    let sections: Record<string, [number, number]> = {};
    for (const [id, [section, points]] of Object.entries(problems)) {
      if (!(section in sections)) sections[section] = [0, 0];
      if (id in answers && answers[id] !== undefined) {
        total[0] += points[0];
        sections[section][0] += points[0];
      }
      total[1] += points[0];
      sections[section][1] += points[0];
    }

    const progress = Math.round((total[0] / total[1]) * 100);
    const sectionProgress = Object.fromEntries(
      Object.entries(sections).map(([section, points]) => [
        section,
        Math.round((points[0] / points[1]) * 100),
      ])
    );
    return [progress, sectionProgress];
  }, [answers, problems]);

  return (
    <ContestContext.Provider
      value={{
        randomizeProblemOrder: randomizeProblemOrder ?? false,
        randomizeAnswerOrder: randomizeAnswerOrder ?? false,
        registerProblem,
      }}>
      <div className="prose prose-md px-4 mx-auto my-5">
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
    <div className="bg-white border-t border-zinc-600 flex justify-between p-3 overflow-hidden sticky bottom-0 print:hidden">
      {terminated && (
        <ProgressBlock className="w-20" percentage={100}>
          00:00
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
        <span className="hidden xs:inline">Avanzamento: </span>
        {progress}%
      </ProgressBlock>
      <Button
        className="text-white bg-emerald-600"
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
      <div className="h-10" />
      <div className="text-md flex flex-row justify-center gap-5">
        <Button className="border-black" onClick={close}>
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
