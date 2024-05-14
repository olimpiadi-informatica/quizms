import React, { Children, ReactNode, isValidElement, useEffect, useState } from "react";

import { useIsAfter } from "@olinfo/react-components";
import classNames from "classnames";
import { addSeconds } from "date-fns";
import { partition } from "lodash-es";
import { AlertTriangle, LucideIcon } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Dropdown, DropdownButton, DropdownItem, Error } from "~/components";

import "./css/index.css";

type ErrorWithTimestamp = Error & { timestamp: Date };

export function BaseLayout({ children }: { children: ReactNode }) {
  const [navbar, other] = partition(
    Children.toArray(children),
    (node) => isValidElement(node) && node.type === Navbar,
  );

  const [errors, setErrors] = useState<ErrorWithTimestamp[]>([]);

  useEffect(() => {
    window.addEventListener("unhandledrejection", handleException);
    return () => window.removeEventListener("unhandledrejection", handleException);

    function handleException(e: PromiseRejectionEvent) {
      const error = e.reason;
      error.timestamp = new Date();
      setErrors((errors) => [...errors, error]);
    }
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col screen:overflow-y-scroll">
      {navbar}
      <ErrorBoundary FallbackComponent={Error}>{other}</ErrorBoundary>
      <div className="toast">
        {errors.map((error, i) => (
          <ErrorToast error={error} key={i} />
        ))}
      </div>
    </div>
  );
}

function ErrorToast({ error }: { error: ErrorWithTimestamp }) {
  const hide = useIsAfter(addSeconds(error.timestamp, 10));

  return (
    <div className={classNames("alert alert-error w-screen max-w-sm", hide && "hidden")}>
      <AlertTriangle />
      <div className="text-wrap">{error.message}</div>
    </div>
  );
}

type NavbarProps = {
  color: `bg-${string} text-${string}-content`;
  flow?: "flex-row" | "flex-row-reverse";
  user?: string | null;
  userIcon: LucideIcon;
  logout?: () => Promise<void>;
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
      <Dropdown align={flow !== "flex-row" && "dropdown-end"}>
        <DropdownButton>
          <UserIcon />
          <div className="truncate uppercase">{user ?? "Utente anonimo"}</div>
        </DropdownButton>
        <DropdownItem hidden={!logout}>
          <button onClick={logout}>Cambia utente</button>
        </DropdownItem>
      </Dropdown>
      {children}
    </div>
  );
}
