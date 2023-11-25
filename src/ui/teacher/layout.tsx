import React, { ReactNode, useRef } from "react";

import { GraduationCap, UserIcon } from "lucide-react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import Modal from "~/ui/components/modal";
import { useTeacher } from "~/ui/teacher/provider";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col px-4" /* TODO: dvh */>
      <div className="flex justify-center">
        <div className="grow lg:max-w-3xl">
          <Navbar />
        </div>
      </div>
      <ErrorBoundary FallbackComponent={ErrorView}>{children}</ErrorBoundary>
    </div>
  );
}

function Navbar() {
  const { teacher, school, logout } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="mb-4 border-b border-base-content">
      <div className="flex flex-wrap items-center justify-between py-2">
        <div className="flex items-center gap-2 px-4 py-3">
          <GraduationCap className="h-full" />
          <span className="text-sm font-semibold uppercase">
            {school?.name ?? "Nessuna scuola"}
          </span>
        </div>
        <button
          className="btn btn-ghost no-animation"
          onClick={() => modalRef.current?.showModal()}>
          <UserIcon />
          <span className="uppercase">{teacher.name || "Utente anonimo"}</span>
        </button>
      </div>
      <Modal title="Vuoi cambiare utente?" ref={modalRef}>
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={logout}>
            Cambia utente
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ErrorView({ error }: FallbackProps) {
  return (
    <div className="m-auto my-64 w-64">
      <p className="text-red-500">{error.message}</p>
    </div>
  );
}
