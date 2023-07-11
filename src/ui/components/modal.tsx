import React, { ReactNode, Ref, forwardRef } from "react";

type ModalProps = {
  title: string;
  children: ReactNode;
};

export default forwardRef(function Modal(
  { title, children }: ModalProps,
  ref: Ref<HTMLDialogElement>
) {
  return (
    <dialog ref={ref} className="modal">
      <form method="dialog" className="modal-box">
        <button
          className="btn-ghost btn-sm btn-circle btn absolute right-2 top-2"
          aria-label="Chiudi">
          ✕
        </button>
        <h3 className="mt-0 text-lg font-bold">{title}</h3>
        {children}
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>Chiudi</button>
      </form>
    </dialog>
  );
});
