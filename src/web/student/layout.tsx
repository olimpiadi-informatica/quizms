import { type ReactNode, type Ref, forwardRef, useRef } from "react";

import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  Form,
  FormButton,
  Modal,
  Navbar,
  NavbarBrand,
  NavbarContent,
  SubmitButton,
} from "@olinfo/react-components";
import { sumBy } from "lodash-es";
import { FileChartColumn, LogOut, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";

import { type Schema, calcProblemScore } from "~/models";
import { ErrorBoundary, Progress, Prose, Timer, useMetadata } from "~/web/components";

import { useStudent } from "./provider";

export function StudentLayout({ children }: { children: ReactNode }) {
  const metadata = useMetadata();

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
    await new Promise<void>((resolve) => {
      modal.onclose = () => resolve();
    });
    if (modal.returnValue === "1") {
      completedRef.current?.showModal();
    }
  };

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">{metadata.title}</div>
        </NavbarBrand>
        <NavbarContent>
          <div className="flex items-center gap-2">
            <Progress className="hidden w-20 sm:block" percentage={progress}>
              {progress}%
            </Progress>
            <div className="px-3">
              {terminated || !participation.startingTime || !contest.hasOnline ? (
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
                    <FileChartColumn />
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
                disabled={
                  terminated ||
                  (process.env.NODE_ENV === "production" && !participation.startingTime)
                }
                onClick={submit}>
                Termina
              </Button>
            )}
            <UserDropdown />
          </div>
        </NavbarContent>
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary>
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

  const name = student.userData?.name as string;
  const surname = student.userData?.surname as string;

  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">
          {name} {surname}
        </div>
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem>
          <button type="button" className="flex justify-between gap-4" onClick={logout}>
            Esci <LogOut size={20} />
          </button>
        </DropdownItem>
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

  const maxPoints = sumBy(Object.values(schema), "maxPoints");

  const link = `https://docs.google.com/forms/d/e/1FAIpQLSdeRE1u3LbVD4mv0yEweaSRg1fzNbZjElQ10MXmfSToMmW5oQ/viewform?usp=pp_url\
&entry.191389305=${student.userData?.surname}\
&entry.580703203=${student.userData?.name}\
&entry.1306098865=${student.userData?.classYear}\
&entry.1848719994=${student.userData?.classSection}\
&entry.2127391105=${student.variant}\
&entry.1620368290=${student.participationId?.split("-")[0]}`;

  return (
    <Modal ref={ref} title="Prova terminata">
      <p>La prova è terminata.</p>
      {student.score !== undefined && (
        <>
          <p>
            Hai ottenuto un punteggio di <b>{student.score}</b> su <b>{maxPoints}</b>.
          </p>
          <table className="table table-sm text-center mt-4">
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
                const answer = student.answers?.[problem];
                const problemSchema = schema[problem];
                const correctOptions = problemSchema.options
                  ?.filter((o) => o.points === problemSchema.maxPoints)
                  .map((o) => o.value);
                return (
                  <tr key={problem}>
                    <td>{problem}</td>
                    <td>{answer ?? "-"}</td>
                    <td>{correctOptions?.join(", ")}</td>
                    <td>{calcProblemScore(problemSchema, answer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <div className="mx-auto">
        <a href={link} className="btn btn-info" target="_blank" rel="noreferrer">
          <ThumbsUp />
          <ThumbsDown />
          Valuta questa gara
        </a>
      </div>
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
