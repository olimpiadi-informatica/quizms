import React, { ReactNode } from "react";

import { GraduationCap } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import Error from "~/ui/components/error";
import { useTeacher } from "~/ui/teacher/provider";

export function Layout({ children }: { children: ReactNode }) {
  const { school, logout } = useTeacher();

  return (
    <div className="flex h-screen flex-col">
      <div className="navbar flex-none bg-primary text-primary-content">
        <div className="dropdown max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <GraduationCap className="flex-none" />
            <div className="truncate uppercase">{school?.name || "Scuola invalida"}</div>
          </div>
          <ul className="menu dropdown-content menu-sm z-30 mt-3 w-52 rounded-box bg-base-300 p-2 text-base-content shadow-lg">
            <li>
              <button onClick={logout}>Cambia utente</button>
            </li>
          </ul>
        </div>
      </div>
      <ErrorBoundary FallbackComponent={Error}>{children}</ErrorBoundary>
    </div>
  );
}
