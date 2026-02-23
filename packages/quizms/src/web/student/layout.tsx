import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@olinfo/react-components";
import { addMilliseconds, isPast } from "date-fns";
import { sumBy } from "lodash-es";
import { FileChartColumn, LogOut, RotateCcw } from "lucide-react";

import { useUserAgent } from "~/utils";
import { ErrorBoundary, Progress, Prose, Timer, Title } from "~/web/components";

import { useStudent } from "./context";
import { CompletedModal, SubmitModal } from "./modals";

export function StudentLayout({ children }: { children: ReactNode }) {
  const completedRef = useRef<HTMLDialogElement>(null);
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, schema, reset, participation, terminated, logout, enforceFullscreen } =
    useStudent();

  const answered = sumBy(Object.values(student.answers ?? {}), (s) => Number(s === 0 || !!s));
  const total = Math.max(schema ? Object.keys(schema).length : contest.problemIds.length, 1);
  const progress = Math.round((answered / total) * 100);

  const [warningDeadline, setWarningDeadline] = useState<Date | undefined>();
  const ua = useUserAgent();

  useEffect(() => {
    if (!enforceFullscreen || terminated) return;

    const interval = setInterval(() => {
      const isFullscreen = !!document.fullscreenElement || !ua.hasFullscreen;
      const isFocused =
        document.hasFocus() || (!ua.hasFullscreen && document.visibilityState === "visible");

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
  }, [enforceFullscreen, logout, student.uid, terminated, ua.hasFullscreen]);

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
          {ua.hasFullscreen && !document.fullscreenElement && (
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
                {schema && (
                  <div className="tooltip tooltip-bottom h-full" data-tip="Mostra risultati">
                    <Button
                      className="btn-primary btn-sm h-full"
                      onClick={() => completedRef.current?.showModal()}
                      aria-label="Mostra risultati">
                      <FileChartColumn />
                    </Button>
                  </div>
                )}
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
StudentLayout.displayName = "StudentLayout";

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
UserDropdown.displayName = "UserDropdown";
