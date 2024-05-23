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

import { Error, Loading } from "~/components";
import { Contest } from "~/models";

type Props = {
  name: string;
  contests: Contest[];
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminLayout({ name, contests, logout, children }: Props) {
  const location = useLocation();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [location]);

  const [, params] = useRoute("/:contestId/*");
  const contest = contests.find((c) => c.id === params?.contestId);

  return (
    <>
      <Navbar color="bg-error text-error-content">
        <div>
          <div className="btn btn-ghost no-animation cursor-auto">Olimpiadi di Informatica</div>
          {contest && contests.length >= 2 && (
            <NavbarMenu>
              <li>
                <details ref={ref}>
                  <summary className="after:forced-color-adjust-none">{contest.name}</summary>
                  <ul>
                    {contests.map((c) => (
                      <li key={c.id}>
                        <Link
                          className={clsx(contest.id === c.id && "active")}
                          href={`/${c.id}/${params!["*"]}`}>
                          {contests.find((c) => c.id === contest.id)?.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            </NavbarMenu>
          )}
        </div>
        <UserDropdown name={name} logout={logout} />
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}

function UserDropdown({ name, logout }: { name: string; logout: () => Promise<void> }) {
  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">{name}</div>
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
