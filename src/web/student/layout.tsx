import React, { ReactNode, Ref, forwardRef, useEffect, useRef } from "react";

import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownMenu,
  Form,
  FormButton,
  Modal,
  Navbar,
  SubmitButton,
} from "@olinfo/react-components";
import { sumBy } from "lodash-es";
import { FileBarChart2, LogOut, RotateCcw } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Schema, calcProblemScore } from "~/models";
import { Error, Progress, Prose, Timer } from "~/web/components";

import { useStudent } from "./provider";

export function StudentLayout({ children }: { children: ReactNode }) {
  const completedRef = useRef<HTMLDialogElement>(null);
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, schema, reset, participation, terminated } = useStudent();

  const answered = sumBy(Object.values(student.answers ?? {}), (s) => Number(s === 0 || !!s));
  const total = Math.max(Object.keys(schema).length, 1);
  const progress = Math.round((answered / total) * 100);

  const submit = async () => {
    const modal = submitRef.current;
    if (!modal) return;

    modal.returnValue = "0";
    modal.showModal();
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    await new Promise<void>((resolve) => (modal.onclose = () => resolve()));
    if (modal.returnValue === "1") {
      completedRef.current?.showModal();
    }
  };

  useEffect(() => {
    if (import.meta.env.QUIZMS_MODE === "contest") {
      console.error(
        "%cAprire la console è severamente vietato dal regolamento. Questo incidente verrà segnalato agli amministratori del sito e al tuo insegnante. Qualsiasi tentativo di manomettere la piattaforma comporta la squalifica.",
        "color: #f00",
      );
    }
  }, []);

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <div className="btn btn-ghost no-animation cursor-auto">{contest.name}</div>
        <div className="gap-2 self-stretch *:flex-none">
          <Progress className="hidden w-20 sm:block" percentage={progress}>
            {progress}%
          </Progress>
          <div className="px-3">
            {terminated || !participation.startingTime || !contest.duration ? (
              <span className="font-mono">00:00</span>
            ) : (
              <Timer
                startTime={participation.startingTime}
                duration={contest.duration}
                noAnimation
              />
            )}
          </div>
          {terminated && reset ? (
            <>
              <div className="tooltip tooltip-bottom h-full" data-tip="Mostra risultati">
                <Button
                  className="btn-primary btn-sm h-full"
                  onClick={() => completedRef.current?.showModal()}
                  aria-label="Mostra risultati">
                  <FileBarChart2 />
                </Button>
              </div>
              <div className="tooltip tooltip-bottom h-full" data-tip="Ricomincia">
                <Button
                  className="btn-primary btn-sm h-full"
                  onClick={reset}
                  aria-label="Ricomincia">
                  <RotateCcw />
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="btn-primary btn-sm h-full"
              disabled={terminated || (import.meta.env.PROD && !participation.startingTime)}
              onClick={submit}>
              Termina
            </Button>
          )}
        </div>
        <UserDropdown />
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary FallbackComponent={Error}>
          <CompletedModal ref={completedRef} schema={schema} />
          <SubmitModal ref={submitRef} />
          <Prose>
            {contest.longName && <h1 className="text-pretty">{contest.longName}</h1>}
            {children}
          </Prose>
        </ErrorBoundary>
      </div>
    </>
  );
}

function UserDropdown() {
  const { student, logout } = useStudent();

  const name = student.personalInformation?.name as string;
  const surname = student.personalInformation?.surname as string;

  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">
          {name} {surname}
        </div>
      </DropdownButton>
      <DropdownMenu>
        <li>
          <Button className="flex justify-between gap-4" onClick={logout}>
            Esci <LogOut size={20} />
          </Button>
        </li>
      </DropdownMenu>
    </Dropdown>
  );
}

const CompletedModal = forwardRef(function CompletedModal(
  { schema }: { schema: Schema },
  ref: Ref<HTMLDialogElement>,
) {
  const { student } = useStudent();

  const problems = Object.keys(schema);
  problems.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const maxPoints = sumBy(Object.values(schema), "pointsCorrect");

  return (
    <Modal ref={ref} title="Prova terminata">
      <p>La prova è terminata.</p>
      {student.score !== undefined && (
        <>
          <p>
            Hai ottenuto un punteggio di <b>{student.score}</b> su <b>{maxPoints}</b>.
          </p>
          <table className="table table-sm mt-4">
            <thead>
              <tr>
                <th scope="col">Domanda</th>
                <th scope="col">Risposta</th>
                <th scope="col">Soluzione</th>
                <th scope="col">Punteggio</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const answer = student.answers?.[problem]?.toString()?.trim();
                const problemSchema = schema[problem];
                return (
                  <tr key={problem}>
                    <td>{problem}</td>
                    <td>{answer ?? "-"}</td>
                    <td>{problemSchema.optionsCorrect?.join(", ")}</td>
                    <td>{calcProblemScore(problemSchema, answer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </Modal>
  );
});

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { student, setStudent, onSubmit } = useStudent();

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const confirm = async () => {
    try {
      await setStudent({
        ...student,
        finishedAt: new Date(),
      });
      await onSubmit?.();
      if (ref && "current" in ref && ref.current) {
        ref.current.returnValue = "1";
      }
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <Form onSubmit={confirm} className="!max-w-full">
        <div className="flex flex-wrap justify-center gap-2">
          <FormButton onClick={close}>Annulla</FormButton>
          <SubmitButton className="btn-error">Conferma</SubmitButton>
        </div>
      </Form>
    </Modal>
  );
});
