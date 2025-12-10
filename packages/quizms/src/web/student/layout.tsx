import { forwardRef, type ReactNode, type Ref, useEffect, useRef, useState } from "react";

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
import { addMilliseconds, isPast } from "date-fns";
import { sumBy } from "lodash-es";
import { FileChartColumn, LogOut, RotateCcw } from "lucide-react";

import { ErrorBoundary, Progress, Prose, Timer, Title } from "~/web/components";

import { useStudent } from "./context";

export function StudentLayout({
  children,
  enforceFullscreen,
}: {
  children: ReactNode;
  enforceFullscreen?: boolean;
}) {
  const completedRef = useRef<HTMLDialogElement>(null);
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, schema, reset, participation, terminated, logout } = useStudent();

  const answered = sumBy(Object.values(student.answers ?? {}), (s) => Number(s === 0 || !!s));
  const total = Math.max(Object.keys(schema).length, 1);
  const progress = Math.round((answered / total) * 100);

  const [warningDeadline, setWarningDeadline] = useState<Date | undefined>();
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 0));

  useEffect(() => {
    if (!enforceFullscreen || terminated) return;

    const interval = setInterval(() => {
      const isFullscreen = !!document.fullscreenElement || isIOS;
      const isFocused = document.hasFocus() || (isIOS && document.visibilityState === "visible");

      const key = `quizms_last_active_${student.uid}`;
      const now = new Date();

      if (isFullscreen && isFocused) {
        localStorage.setItem(key, now.toISOString());
        setWarningDeadline(undefined);
      } else {
        const lastActive = localStorage.getItem(key);
        const lastActiveTime = lastActive ? new Date(lastActive) : now;

        const deadlineDate = addMilliseconds(lastActiveTime, 10_500);
        setWarningDeadline(deadlineDate);

        if (isPast(deadlineDate)) {
          logout?.();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [enforceFullscreen, logout, student.uid, terminated, isIOS]);

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

  if (warningDeadline && !terminated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-base-100 p-4 text-center">
        <div className="flex max-w-lg flex-col items-center gap-6">
          <h2 className="text-3xl font-bold">Attenzione!</h2>
          <p className="text-xl">
            Non puoi perdere il focus o uscire dalla modalità a schermo intero.
          </p>
          <div className="text-7xl font-black font-mono p-4">
            <Timer endTime={warningDeadline} hideMinutes />
          </div>
          {!isIOS && !document.fullscreenElement && (
            <Button
              className="btn-warning btn-lg font-bold"
              onClick={() => document.documentElement.requestFullscreen()}>
              Torna a schermo intero
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
        <NavbarContent>
          <div className="flex items-center gap-2">
            <Progress className="hidden w-20 sm:block" percentage={progress}>
              {progress}%
            </Progress>
            <div className="px-3">
              {terminated || !student.finishedAt || !contest.hasOnline ? (
                <span className="font-mono">00:00</span>
              ) : (
                <Timer endTime={student.finishedAt} noAnimation />
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
                {reset && (
                  <div className="tooltip tooltip-bottom h-full" data-tip="Ricomincia">
                    <Button
                      className="btn-primary btn-sm h-full"
                      onClick={reset}
                      aria-label="Ricomincia">
                      <RotateCcw />
                    </Button>
                  </div>
                )}
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
          <CompletedModal ref={completedRef} />
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

const CompletedModal = forwardRef(function CompletedModal(_props, ref: Ref<HTMLDialogElement>) {
  return (
    <Modal ref={ref} title="Prova terminata">
      <p>La prova è terminata.</p>
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
