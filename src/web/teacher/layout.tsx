import React, { ReactNode, Suspense } from "react";

import classNames from "classnames";
import { ChevronDown, GraduationCap } from "lucide-react";

import { Loading } from "~/components";
import { Contest, Participation } from "~/models";
import { BaseLayout, Navbar } from "~/web/base-layout";

type Props = {
  contests: Contest[];
  participations: Participation[];
  activeContest?: Contest;
  activeParticipation?: Participation;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function TeacherLayout({
  activeParticipation,
  participations,
  activeContest,
  contests,
  logout,
  children,
}: Props) {
  return (
    <BaseLayout>
      <Navbar
        user={activeParticipation?.name ?? participations[0]?.name}
        userIcon={GraduationCap}
        logout={logout}
        color="bg-primary text-primary-content">
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
              <ul className="highlight-border menu dropdown-content menu-sm z-30 mt-3 w-52 gap-1 rounded-box bg-base-200 p-2 text-base-content">
                {participations.map((p) => {
                  const contest = contests.find((c) => c.id === p.contestId)!;
                  return (
                    <li key={p.id}>
                      <a
                        className={classNames(activeContest?.id === p.contestId && "active")}
                        href={`#${p.contestId}`}>
                        {contest.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Navbar>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </BaseLayout>
  );
}
