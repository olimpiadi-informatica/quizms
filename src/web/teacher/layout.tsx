import { ReactNode, Suspense } from "react";

import classNames from "classnames";
import { ChevronDown, GraduationCap } from "lucide-react";

import { Dropdown, DropdownButton, DropdownItem, Loading } from "~/components";
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
          <Dropdown>
            <DropdownButton>
              <div className="truncate">{activeContest.name}</div>
              {participations.length > 1 && <ChevronDown className="size-3" />}
            </DropdownButton>
            {participations.map((p) => {
              const contest = contests.find((c) => c.id === p.contestId)!;
              return (
                <DropdownItem key={p.id} hidden={participations.length === 1}>
                  <a
                    className={classNames(activeContest?.id === p.contestId && "active")}
                    href={`#${p.contestId}`}>
                    {contest.name}
                  </a>
                </DropdownItem>
              );
            })}
          </Dropdown>
        )}
      </Navbar>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </BaseLayout>
  );
}
