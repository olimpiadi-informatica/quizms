import React, { ReactNode, Ref, forwardRef, useEffect, useRef } from "react";

import { sumBy } from "lodash-es";
import { User } from "lucide-react";

import { Button, Buttons, Modal, Progress, Timer } from "~/components";
import Prose from "~/mdx/components/prose";
import { BaseLayout, Navbar } from "~/web/base-layout";

import { useStudent } from "./provider";

export function Layout({ children }: { children: ReactNode }) {
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, reset, participation, terminated, logout } = useStudent();

  const name = student.personalInformation?.name as string;
  const surname = student.personalInformation?.surname as string;

  const progress = Math.round(
    (sumBy(Object.values(student.answers ?? {}), (s) => Number(!!s)) / contest.problemIds.length) *
      100,
  );

  useEffect(() => {
    if (import.meta.env.QUIZMS_MODE === "contest") {
      console.error(
        "%cAprire la console è severamente vietato dal regolamento. Questo incidente verrà segnalato agli amministratori del sito e al tuo insegnante. Qualsiasi tentativo di manomettere la piattaforma comporta la squalifica.",
        "color: #ff0000",
      );
    }
  }, []);

  return (
    <BaseLayout>
      <Navbar
        user={`${name} ${surname}`}
        userIcon={User}
        logout={logout}
        color="bg-base-300 text-base-content"
        flow="flex-row">
        <div className="h-full gap-3">
          <Progress className="hidden w-20 sm:block" percentage={progress}>
            {progress}%
          </Progress>
          <div className="flex-none px-3">
            {terminated || !participation.startingTime || !contest.duration ? (
              <span className="font-mono">00:00</span>
            ) : (
              <Timer startTime={participation.startingTime} duration={contest.duration} />
            )}
          </div>
          <div className="h-full flex-none py-0.5">
            {terminated && reset ? (
              <button className="btn btn-warning btn-sm h-full" onClick={reset}>
                Ricomincia
              </button>
            ) : (
              <button
                className="btn btn-success btn-sm h-full"
                disabled={terminated || !participation.startingTime}
                onClick={() => submitRef.current?.showModal()}>
                Termina
              </button>
            )}
          </div>
        </div>
      </Navbar>
      <SubmitModal ref={submitRef} />
      <Prose>
        {contest.name && <h1 className="text-pretty">{contest.name}</h1>}
        {children}
      </Prose>
    </BaseLayout>
  );
}

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { submit } = useStudent();

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <Buttons className="mt-3">
        <Button className="btn-info">Annulla</Button>
        <Button className="btn-error" onClick={() => submit()}>
          Conferma
        </Button>
      </Buttons>
    </Modal>
  );
});
