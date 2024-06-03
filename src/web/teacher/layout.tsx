import { ReactNode, Suspense, useEffect, useRef } from "react";

import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownMenu,
  Navbar,
  NavbarMenu,
} from "@olinfo/react-components";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useRoute } from "wouter";

import { Contest, Participation } from "~/models";
import { Error, Loading } from "~/web/components";

type Props = {
  contests: Contest[];
  participations: Participation[];
  logout: () => Promise<void>;
  children: ReactNode;
};

export function TeacherLayout({ contests, participations, logout, children }: Props) {
  const location = useLocation();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [location]);

  const [, params] = useRoute("/:contestId/*");
  const contest = contests.find((c) => c.id === params?.contestId);
  const participation = participations.find((p) => p.contestId === params?.contestId);

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <div>
          <div className="btn btn-ghost no-animation cursor-auto">Olimpiadi di Informatica</div>
          {contest && (
            <NavbarMenu>
              {participations.length >= 2 && (
                <li>
                  <details ref={ref}>
                    <summary className="after:forced-color-adjust-none">{contest.name}</summary>
                    <ul>
                      {participations.map((p) => (
                        <li key={p.id}>
                          <Link
                            className={clsx(contest.id === p.contestId && "active")}
                            href={`/${p.contestId}/${params!["*"]}`}>
                            {contests.find((c) => c.id === p.contestId)?.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              )}
              <li>
                <Link href={`/${contest.id}/`}>Gestione gara</Link>
              </li>
              <li>
                <Link href={`/${contest.id}/students/`}>Gestione studenti</Link>
              </li>
            </NavbarMenu>
          )}
        </div>
        <UserDropdown
          participation={participation}
          participations={participations}
          logout={logout}
        />
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}

type DropdownProps = {
  participations: Participation[];
  participation?: Participation;
  logout: () => Promise<void>;
};

function UserDropdown({ participation, participations, logout }: DropdownProps) {
  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">{(participation ?? participations[0]).name}</div>
      </DropdownButton>
      <DropdownMenu>
        <li>
          <Button className="flex justify-between gap-4" onClick={logout}>
            Esci <LogOut size={20} />
          </Button>
        </li>
      </DropdownMenu>
    </Dropdown>
  );
}
