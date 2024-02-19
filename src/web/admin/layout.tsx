import React, { ReactNode } from "react";

import classNames from "classnames";
import { getAuth } from "firebase/auth";
import { ChevronDown, UserCog } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Error } from "~/components";
import { Contest } from "~/models";
import { useDb } from "~/web/firebase/base-login";

type Props = {
  contests: Contest[];
  activeContest?: Contest;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminLayout({ activeContest, contests, logout, children }: Props) {
  const db = useDb();
  const auth = getAuth(db.app);
  const user = auth.currentUser!;

  return (
    <div className="flex h-dvh flex-col">
      <div className="navbar flex-none flex-row-reverse justify-between bg-error text-error-content">
        <div className="dropdown dropdown-end max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <UserCog className="flex-none" />
            <div className="truncate">{user.displayName}</div>
          </div>
          <ul
            className={classNames(
              "menu dropdown-content menu-sm z-30 mt-3 w-52 p-2",
              "highlight-border rounded-box bg-base-200 text-base-content",
            )}>
            <li>
              <button onClick={logout}>Cambia utente</button>
            </li>
          </ul>
        </div>
        {activeContest && (
          <div className="dropdown max-w-full flex-none">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost no-animation w-full flex-nowrap">
              <div className="truncate">{activeContest.name}</div>
              {contests.length > 1 && <ChevronDown className="size-3 flex-none" />}
            </div>
            {contests.length > 1 && (
              <ul
                className={classNames(
                  "menu dropdown-content menu-sm z-30 mt-3 w-52 gap-1 p-2",
                  "highlight-border rounded-box bg-base-200 text-base-content",
                )}>
                {contests.map((contest) => (
                  <li key={contest.id}>
                    <a
                      className={classNames(contest.id === activeContest.id && "active")}
                      href={`#${contest.id}`}>
                      {contest.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-auto flex-col overflow-y-auto">
        <ErrorBoundary FallbackComponent={Error}>
          {activeContest ? (
            children
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3">
              <p className="text-2xl">Seleziona una gara</p>
              {contests.map((contest) => (
                <a key={contest.id} className="btn btn-error" href={`#${contest.id}`}>
                  {contest.name}
                </a>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
