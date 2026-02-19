import { type ReactNode, Suspense } from "react";

import { ErrorBoundary, Loading, Title } from "@olinfo/quizms/components";
import type { Contest } from "@olinfo/quizms/models";
import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarMenu,
  NavbarMenuItem,
  NavbarSubmenu,
} from "@olinfo/react-components";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { Link, useRoute } from "wouter";

type Props = {
  name: string;
  contests: Contest[];
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminLayout({ name, contests, logout, children }: Props) {
  const [, params] = useRoute("/:contestId/*?");
  const contest = contests.find((c) => c.id === params?.contestId);

  return (
    <>
      <Navbar color="bg-error text-error-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
        {contest && contests.length >= 2 && (
          <NavbarMenu>
            <NavbarSubmenu title={contest.name}>
              {contests.map((c) => {
                const path = params?.["*"];
                const href = path ? `/${c.id}/${path}` : `/${c.id}`;
                return (
                  <NavbarMenuItem key={c.id}>
                    <Link className={clsx(contest.id === c.id && "active")} href={href}>
                      {c.name}
                    </Link>
                  </NavbarMenuItem>
                );
              })}
            </NavbarSubmenu>
            <NavbarMenuItem>
              <Link href={`/${contest.id}`}>Gestione gara</Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link href={`/${contest.id}/schools`}>Gestione scuole</Link>
            </NavbarMenuItem>
          </NavbarMenu>
        )}
        <NavbarContent>
          <UserDropdown name={name} logout={logout} />
        </NavbarContent>
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4 pb-8">
        <ErrorBoundary>
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
        <DropdownItem>
          <Button className="flex justify-between gap-4" onClick={logout}>
            Esci <LogOut size={20} />
          </Button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
