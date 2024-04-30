import { ReactNode } from "react";

import classNames from "classnames";
import { getAuth } from "firebase/auth";
import { ChevronDown, UserCog } from "lucide-react";

import { Dropdown, DropdownButton, DropdownItem } from "~/components";
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
          <Dropdown>
            <DropdownButton>
              <div className="truncate">{activeContest.name}</div>
              {contests.length > 1 && <ChevronDown className="size-3" />}
            </DropdownButton>
            {contests.map((contest) => (
              <DropdownItem key={contest.id} hidden={contests.length === 1}>
                <a
                  className={classNames(contest.id === activeContest.id && "active")}
                  href={`#${contest.id}`}>
                  {contest.name}
                </a>
              </DropdownItem>
            ))}
          </Dropdown>
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
