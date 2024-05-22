import { ReactNode, Ref, forwardRef } from "react";

import clsx from "clsx";

type ModalProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

export const Modal = forwardRef(function Modal(
  { title, className, children }: ModalProps,
  ref: Ref<HTMLDialogElement>,
) {
  return (
    <dialog ref={ref} className="modal">
      <form method="dialog" className={clsx("modal-box", className)}>
        <button
          className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
          aria-label="Chiudi">
          ✕
        </button>
        <h3 className="mb-3 mt-0 text-lg font-bold">{title}</h3>
        {children}
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>Chiudi</button>
      </form>
    </dialog>
  );
});
