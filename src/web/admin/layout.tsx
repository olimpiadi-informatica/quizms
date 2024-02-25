import React, { ReactNode } from "react";

import classNames from "classnames";
import { getAuth } from "firebase/auth";
import { ChevronDown, UserCog } from "lucide-react";

import { Contest } from "~/models";
import { BaseLayout, Navbar } from "~/web/base-layout";
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
    <BaseLayout>
      <Navbar
        user={user.displayName}
        userIcon={UserCog}
        logout={logout}
        color="bg-error text-error-content">
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
              <ul className="highlight-border menu dropdown-content menu-sm z-30 mt-3 w-52 gap-1 rounded-box bg-base-200 p-2 text-base-content">
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
      </Navbar>
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
    </BaseLayout>
  );
}
