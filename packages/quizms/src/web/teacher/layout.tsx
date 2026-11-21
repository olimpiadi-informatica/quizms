import { type ReactNode, Suspense } from "react";

import { Trans } from "@lingui/react/macro";
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

import type { Contest, Venue } from "~/models";
import { ErrorBoundary, Loading, Title, UiLanguageSelect, useLocalize } from "~/web/components";

type Props = {
  name: string;
  contests: Contest[];
  venues: Venue[];
  logout: () => Promise<void>;
  children: ReactNode;
};

export function TeacherLayout({ name, contests, venues, logout, children }: Props) {
  const [, params] = useRoute("/:contestId/*?");
  const contest = contests.find((c) => c.id === params?.contestId);
  const localize = useLocalize();

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
        {contest && (
          <NavbarMenu>
            {venues.length >= 2 && (
              <NavbarSubmenu title={localize(contest.name)}>
                {venues.map((p) => {
                  const path = params?.["*"];
                  const href = path ? `/${p.contestId}/${path}` : `/${p.contestId}`;
                  return (
                    <NavbarMenuItem key={p.id}>
                      <Link className={clsx(contest.id === p.contestId && "active")} href={href}>
                        {localize(contests.find((c) => c.id === p.contestId)?.name)}
                      </Link>
                    </NavbarMenuItem>
                  );
                })}
              </NavbarSubmenu>
            )}
            <NavbarMenuItem>
              <Link href={`/${contest.id}`}>
                <Trans>Contest management</Trans>
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link href={`/${contest.id}/students`}>
                <Trans>Student management</Trans>
              </Link>
            </NavbarMenuItem>
          </NavbarMenu>
        )}
        <NavbarContent>
          <div className="flex items-center gap-2">
            <UiLanguageSelect />
            <UserDropdown name={name} logout={logout} />
          </div>
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
  name: string;
  logout: () => Promise<void>;
};

function UserDropdown({ name, logout }: DropdownProps) {
  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">{name}</div>
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem>
          <Button className="flex justify-between gap-4" onClick={logout}>
            <Trans>Log out</Trans> <LogOut size={20} />
          </Button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
