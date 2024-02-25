import React, { Children, ReactNode, isValidElement } from "react";

import classNames from "classnames";
import { partition } from "lodash-es";
import { LucideIcon } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Error } from "~/components";

export function BaseLayout({ children }: { children: ReactNode }) {
  const [navbar, other] = partition(
    Children.toArray(children),
    (node) => isValidElement(node) && node.type === Navbar,
  );

  return (
    <div className="fixed inset-0 flex flex-col screen:overflow-y-scroll">
      {navbar}
      <ErrorBoundary FallbackComponent={Error}>{other}</ErrorBoundary>
    </div>
  );
}

type NavbarProps = {
  color: `bg-${string} text-${string}-content`;
  flow?: "flex-row" | "flex-row-reverse";
  user?: string | null;
  userIcon: LucideIcon;
  logout?: () => Promise<void> | void;
  children: ReactNode;
};

export function Navbar({ color, flow, user, userIcon: UserIcon, logout, children }: NavbarProps) {
  return (
    <div
      className={classNames(
        "navbar sticky top-0 z-20 h-16 justify-between px-3 backdrop-blur [--tw-bg-opacity:0.85] print:hidden",
        flow ?? "flex-row-reverse",
        color,
      )}>
      <div className="dropdown dropdown-end max-w-full flex-none">
        <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
          <UserIcon className="flex-none" />
          <div className="truncate uppercase">{user ?? "Utente anonimo"}</div>
        </div>
        {logout && (
          <ul className="highlight-border menu dropdown-content menu-sm z-30 mt-3 w-52 rounded-box bg-base-200 p-2 text-base-content">
            <li>
              <button onClick={logout}>Cambia utente</button>
            </li>
          </ul>
        )}
      </div>
      {children}
    </div>
  );
}
