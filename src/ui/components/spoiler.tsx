import React, { Fragment, ReactNode, createRef } from "react";

import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";

type Props = {
  title: string;
  children: ReactNode;
};

export default function Spoiler({ title, children }: Props) {
  const ref = createRef<HTMLDivElement>();
  const replace = (className: string, newClassName: string) => {
    if (!ref.current) return;
    ref.current.className = ref.current.className.replace(className, newClassName);
  };
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full justify-between">
            <p className="mt-1 mb-2">{title}</p>
            <ChevronDownIcon
              className={classNames("my-auto h-7 w-7 transition duration-200", {
                "rotate-180 transform": open,
              })}
            />
          </Disclosure.Button>
          <Transition
            enter="transition-all duration-200 ease-in"
            enterFrom="transform max-h-0 opacity-25"
            enterTo="transform max-h-screen opacity-100"
            leave="transition-all duration-200 ease-out"
            leaveFrom="transform max-h-screen opacity-100"
            leaveTo="transform max-h-0 opacity-25"
            afterEnter={() => replace("max-h-screen", "max-h-none")}
            beforeLeave={() => replace("max-h-none", "max-h-screen")}
            unmount={false}
            as={Fragment}>
            <div className="overflow-y-hidden" ref={ref}>
              <hr className="mt-3 mb-0 border-zinc-400" />
              <Disclosure.Panel>{children}</Disclosure.Panel>
            </div>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}
