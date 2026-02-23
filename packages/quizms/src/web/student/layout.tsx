import { type ReactNode, useRef } from "react";

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
import { sumBy } from "lodash-es";
import { FileChartColumn, LogOut, RotateCcw } from "lucide-react";

import { ErrorBoundary, Progress, Prose, Timer, Title } from "~/web/components";

import { useStudent } from "./context";
import { CompletedModal, SubmitModal } from "./modals";

export function StudentLayout({ children }: { children: ReactNode }) {
  const completedRef = useRef<HTMLDialogElement>(null);
  const submitRef = useRef<HTMLDialogElement>(null);

  const { contest, student, schema, reset, participation, terminated } = useStudent();

  const answered = sumBy(Object.values(student.answers ?? {}), (s) => Number(s === 0 || !!s));
  const total = Math.max(schema ? Object.keys(schema).length : contest.problemIds.length, 1);
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
