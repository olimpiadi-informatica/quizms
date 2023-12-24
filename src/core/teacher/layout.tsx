import React, { ReactNode, useRef } from "react";

import { BadgeInfo, GraduationCap } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import Error from "../components/error";
import Modal from "../components/modal";
import { useTeacher } from "./provider";

export function TeacherLayout({ children }: { children: ReactNode }) {
  const { contests, schools, logout } = useTeacher();
  const instructions = contests[0].instructions;
  const modalRef = useRef<HTMLDialogElement>(null);
  /* useEffect(() => {
    modalRef.current?.showModal();
  }, [modalRef]); */

  return (
    <div className="flex h-screen flex-col">
      <div className="navbar flex-none justify-between bg-primary text-primary-content">
        <div className="dropdown max-w-full flex-none">
          <div tabIndex={0} role="button" className="btn btn-ghost no-animation w-full flex-nowrap">
            <GraduationCap className="flex-none" />
            <div className="truncate uppercase">{schools[0]?.name || "Scuola invalida"}</div>
          </div>
          <ul className="menu dropdown-content menu-sm z-30 mt-3 w-52 rounded-box bg-base-300 p-2 text-base-content shadow-lg">
            <li>
              <button onClick={logout}>Cambia scuola</button>
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
      <div className="flex flex-auto flex-col overflow-y-auto">
        <ErrorBoundary FallbackComponent={Error}>{children}</ErrorBoundary>
        <Modal ref={modalRef} title="Istruzioni per la gara">
          <div className="prose whitespace-pre-wrap">{instructions}</div>
        </Modal>
      </div>
    </div>
  );
}
