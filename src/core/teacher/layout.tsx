import React, { ReactNode, Suspense } from "react";

import classNames from "classnames";
import { ChevronDown, GraduationCap } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Contest, Participation } from "~/models";

import Error from "../components/error";
import Loading from "../components/loading";

type Props = {
  contests: Contest[];
  participations: Participation[];
  activeContest?: Contest;
  activeParticipation?: Participation;
  setActiveContest: (contestId: string) => void;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function TeacherLayout({
  contests,
  participations,
  activeContest,
  activeParticipation,
  setActiveContest,
  logout,
  children,
}: Props) {
  return (
    <div className="flex h-dvh flex-col">
      <div className="navbar flex-none justify-between bg-primary text-primary-content">
        {activeContest && (
          <div className="dropdown max-w-full flex-none">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost no-animation w-full flex-nowrap">
              <div className="truncate">{activeContest.name}</div>
              {participations.length > 1 && <ChevronDown className="size-3 flex-none" />}
            </div>
            {participations.length > 1 && (
              <ul
                className={classNames(
                  "menu dropdown-content menu-sm z-30 mt-3 w-52 gap-1 p-2",
                  "highlight-border rounded-box bg-base-200 text-base-content",
                )}>
                {participations.map((p) => {
                  const contest = contests.find((c) => c.id === p.contestId)!;
                  return (
                    <li key={p.id}>
                      <button
                        className={classNames(activeContest?.id === p.contestId && "active")}
                        onClick={() => setActiveContest(p.contestId)}>
                        {contest.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <div className="dropdown dropdown-end max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <GraduationCap className="flex-none" />
            <div className="truncate">
              {activeParticipation?.name ?? participations[0]?.name ?? "Scuola invalida"}
            </div>
          </div>
          <ul
            className={classNames(
              "menu dropdown-content menu-sm z-30 mt-3 w-52 p-2",
              "highlight-border rounded-box bg-base-200 text-base-content",
            )}>
            <li>
              <button onClick={logout}>Cambia scuola</button>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-auto flex-col overflow-y-auto">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
