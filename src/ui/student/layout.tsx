import React, { ReactNode } from "react";

import { User } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import Error from "~/ui/components/error";
import Progress from "~/ui/components/progress";
import Prose from "~/ui/components/prose";
import Timer from "~/ui/components/timer";

import { useStudent } from "./provider";

export function Layout({ children }: { children: ReactNode }) {
  const { contest, student, school, terminated } = useStudent();

  const name = student.personalInformation?.name as string;
  const surname = student.personalInformation?.surname as string;

  return (
    <div className="flex h-screen flex-col">
      <div className="navbar flex-none justify-between bg-primary text-primary-content">
        <div className="dropdown max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <User className="flex-none" />
            <div className="truncate uppercase">
              {name} {surname}
            </div>
          </div>
          <ul className="menu dropdown-content menu-sm z-30 mt-3 w-52 rounded-box bg-base-300 p-2 text-base-content shadow-lg">
            <li>
              <button /* onClick={ TODO } */>Cambia utente</button>
            </li>
          </ul>
        </div>
        <div>
          {terminated && (
            <Progress className="w-20" percentage={100}>
              <span className="font-mono">00:00</span>
            </Progress>
          )}
          {!terminated && (
            <Timer startTime={school.startingTime} duration={{ minutes: contest.duration }} />
          )}
        </div>
      </div>
      <ErrorBoundary FallbackComponent={Error}>
        <div className="overflow-y-scroll">
          <Prose>{children}</Prose>
        </div>
      </ErrorBoundary>
    </div>
  );
}
