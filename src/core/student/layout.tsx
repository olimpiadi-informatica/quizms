import React, { ReactNode, Ref, forwardRef, useEffect, useRef } from "react";

import { sumBy } from "lodash-es";
import { User } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import Prose from "~/mdx/components/prose";

import Error from "../components/error";
import Modal from "../components/modal";
import Progress from "../components/progress";
import Timer from "../components/timer";
import { useStudent } from "./provider";

export function Layout({ children }: { children: ReactNode }) {
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, reset, school, terminated, logout } = useStudent();

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
    <div className="h-dvh screen:overflow-y-scroll">
      <div className="navbar sticky top-0 z-50 h-16 justify-between bg-base-300 bg-opacity-85 px-3 text-base-content backdrop-blur print:hidden">
        <div className="dropdown max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <User className="flex-none" />
            <div className="truncate uppercase">
              {name} {surname}
            </div>
          </div>
          {logout && (
            <ul className="menu dropdown-content menu-sm z-30 mt-3 w-52 rounded-box bg-base-300 p-2 text-base-content shadow-lg">
              <li>
                <button onClick={logout}>Cambia utente</button>
              </li>
            </ul>
          )}
        </div>
        <div className="h-full gap-3">
          <Progress className="hidden min-w-[5rem] sm:block" percentage={progress}>
            {progress}%
          </Progress>
          <div className="flex-none px-3">
            {terminated || !school.startingTime || !contest.duration ? (
              <span className="font-mono">00:00</span>
            ) : (
              <Timer startTime={school.startingTime} duration={contest.duration} />
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
                disabled={terminated || !school.startingTime}
                onClick={() => submitRef.current?.showModal()}>
                Termina
              </button>
            )}
          </div>
          <SubmitModal ref={submitRef} />
        </div>
      </div>
      <ErrorBoundary FallbackComponent={Error}>
        <Prose>
          <h1 className="text-pretty">{contest.name}</h1>
          {children}
        </Prose>
      </ErrorBoundary>
    </div>
  );
}

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { submit } = useStudent();

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <div className="text-md mt-3 flex flex-row justify-center gap-5">
        <button className="btn btn-outline btn-neutral" onClick={close}>
          Annulla
        </button>
        <button className="btn btn-error" onClick={() => submit()}>
          Conferma
        </button>
      </div>
    </Modal>
  );
});
