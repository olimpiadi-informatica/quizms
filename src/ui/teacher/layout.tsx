import React, { ReactNode, useEffect, useRef } from "react";

import { BadgeInfo, GraduationCap } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import Error from "~/ui/components/error";
import Modal from "~/ui/components/modal";
import { useTeacher } from "~/ui/teacher/provider";

export function Layout({ children }: { children: ReactNode }) {
  const { contests, school, logout } = useTeacher();
  const instructions = contests[0].instructions;

  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    modalRef.current?.showModal();
  }, [modalRef.current]);

  return (
    <div className="flex h-screen flex-col">
      <div className="navbar flex-none justify-between bg-primary text-primary-content">
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
        {instructions && (
          <div>
            <button
              className="btn btn-circle btn-ghost"
              onClick={() => modalRef.current?.showModal()}>
              <BadgeInfo size={28} />
            </button>
          </div>
        )}
      </div>
      <ErrorBoundary FallbackComponent={Error}>{children}</ErrorBoundary>
      <Modal ref={modalRef} title="Istruzioni per la gara">
        <div className="mt-2 whitespace-pre-wrap">{instructions}</div>
      </Modal>
    </div>
  );
}
