import React, { ReactNode, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
};

export default function Modal({ title, description, isOpen, close, children }: ModalProps) {
  return (
    <Transition
      enter="ease-out duration-100"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={isOpen}
      as={Fragment}>
      <Dialog onClose={close} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center px-4 pt-4">
          <Transition.Child
            enter="ease-out duration-100"
            enterFrom="scale-75"
            enterTo="scale-100"
            leave="ease-in duration-100"
            leaveFrom="scale-100"
            leaveTo="scale-75"
            as={Fragment}>
            <Dialog.Panel className="bg-white rounded-xl flex flex-col mx-auto mb-auto p-5 w-[32rem] max-h-full">
              <Dialog.Title className="flex flex-row pb-2">
                <div className="text-xl grow mr-3">{title}</div>
                <div className="shrink-0">
                  <button
                    className="flex flex-row justify-items-start mt-0.5"
                    aria-label="Chiudi"
                    onClick={close}>
                    <XMarkIcon className="text-2xl hover:text-red-600 hover:scale-125 transition h-7 w-7" />
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
