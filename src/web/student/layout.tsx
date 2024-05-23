import { ReactNode, Ref, forwardRef, useEffect, useRef } from "react";

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
import { LogOut } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Error, Progress, Timer } from "~/components";
import Prose from "~/mdx/components/prose";

import { useStudent } from "./provider";

export function StudentLayout({ children }: { children: ReactNode }) {
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, reset, participation, terminated } = useStudent();

  const progress = Math.round(
    (sumBy(Object.values(student.answers ?? {}), (s) => Number(!!s)) / contest.problemIds.length) *
      100,
  );

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
        <div>Olimpiadi di Informatica</div>
        <div className="gap-2 self-stretch">
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
          <div className="h-full flex-none">
            {terminated && reset ? (
              <Button className="btn-warning btn-sm h-full" onClick={reset}>
                Ricomincia
              </Button>
            ) : (
              <Button
                className="btn-success btn-sm h-full"
                disabled={terminated || !participation.startingTime}
                onClick={() => submitRef.current?.showModal()}>
                Termina
              </Button>
            )}
          </div>
        </div>
        <UserDropdown />
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary FallbackComponent={Error}>
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

const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { student, setStudent, submit } = useStudent();

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const confirm = async () => {
    try {
      await setStudent({
        ...student,
        submittedAt: new Date(),
      });
      await submit?.();
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
