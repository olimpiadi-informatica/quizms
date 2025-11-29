import { type ReactNode, Suspense } from "react";

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

import type { Contest, Participation } from "~/models";
import { ErrorBoundary, Loading, useMetadata } from "~/web/components";

type Props = {
  contests: Contest[];
  participations: Participation[];
  logout: () => Promise<void>;
  children: ReactNode;
};

export function TeacherLayout({ contests, participations, logout, children }: Props) {
  const metadata = useMetadata();
  const [, params] = useRoute("/:contestId/*?");
  const contest = contests.find((c) => c.id === params?.contestId);
  const participation = participations.find((p) => p.contestId === params?.contestId);

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">{metadata.title}</div>
        </NavbarBrand>
        {contest && (
          <NavbarMenu>
            {participations.length >= 2 && (
              <NavbarSubmenu title={contest.name}>
                {participations.map((p) => (
                  <NavbarMenuItem key={p.id}>
                    <Link
                      className={clsx(contest.id === p.contestId && "active")}
                      href={`/${p.contestId}/${params!["*"]}`}>
                      {contests.find((c) => c.id === p.contestId)?.name}
                    </Link>
                  </NavbarMenuItem>
                ))}
              </NavbarSubmenu>
            )}
            <NavbarMenuItem>
              <Link href={`/${contest.id}`}>Gestione gara</Link>
            </NavbarMenuItem>
            <li className="disabled">
              {/* biome-ignore lint/a11y/useValidAnchor: temporarily disabled */}
              <a href="#">Gestione studenti</a>
            </li>
          </NavbarMenu>
        )}
        <NavbarContent>
          <UserDropdown
            participation={participation}
            participations={participations}
            logout={logout}
          />
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
TeacherLayout.displayName = "TeacherLayout";

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
        <DropdownItem>
          <Button className="flex justify-between gap-4" onClick={logout}>
            Esci <LogOut size={20} />
          </Button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
