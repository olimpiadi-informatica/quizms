import React, { Fragment, ReactNode, useRef } from "react";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
};

export default function Modal({ title, description, isOpen, close, children }: ModalProps) {
  const initialFocus = useRef(null);
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={close} initialFocus={initialFocus} className="relative z-50">
        <Transition.Child
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          as={Fragment}>
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center px-4 pt-4">
          <Transition.Child
            enter="ease-out duration-150"
            enterFrom="scale-75 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-75 opacity-0"
            as={Fragment}>
            <Dialog.Panel
              className={classNames(
                "prose mx-auto mb-auto flex max-h-full w-[32rem] flex-col rounded-xl bg-white",
                "p-5 screen:dark:prose-invert dark:bg-slate-700"
              )}>
              <Dialog.Title className="flex flex-row pb-2">
                <div className="mr-3 grow text-xl" ref={initialFocus}>
                  {title}
                </div>
                <div className="shrink-0">
                  <button
                    className="mt-0.5 flex flex-row justify-items-start"
                    aria-label="Chiudi"
                    onClick={close}>
                    <XMarkIcon className="h-7 w-7 text-2xl transition hover:scale-125 hover:text-red-600 dark:hover:text-red-500" />
                  </button>
                </div>
              </Dialog.Title>
              {description && <Dialog.Description>{description}</Dialog.Description>}
              {children}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
