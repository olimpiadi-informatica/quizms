import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import classNames from "classnames";
import { noop, pull } from "lodash-es";

type Props = {
  align?: "dropdown-end" | false;
  children?: ReactNode;
};

type DropdownContextProps = {
  button?: HTMLDivElement | null;
  addItem: (id: string) => void;
  deleteItem: (id: string) => void;
};

const DropdownContext = createContext<DropdownContextProps>({
  addItem: noop,
  deleteItem: noop,
});

export function Dropdown({ align, children }: Props) {
  const [button, setButton] = useState<HTMLDivElement | null>();
  const [items, setItems] = useState<string[]>([]);

  const context = useMemo(
    () => ({
      button,
      addItem: (id: string) => setItems((prev) => [...prev, id]),
      deleteItem: (id: string) => setItems((prev) => pull(prev, id)),
    }),
    [button, setItems],
  );

  return (
    <DropdownContext.Provider value={context}>
      <div className={classNames("dropdown max-w-full flex-none", align)}>
        <div
          ref={setButton}
          tabIndex={0}
          role="button"
          className="btn btn-ghost no-animation w-full flex-nowrap"
        />
        <ul
          className={classNames(
            "highlight-border menu dropdown-content menu-sm z-30 mt-3 w-fit min-w-52 gap-1 rounded-box bg-base-200 p-2 text-base-content",
            items.length === 0 && "hidden",
          )}>
          {children}
        </ul>
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownButton({ children }: { children: ReactNode }) {
  const { button } = useContext(DropdownContext);
  return <>{button && createPortal(children, button)}</>;
}

export function DropdownItem({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  const id = useId();
  const { addItem, deleteItem } = useContext(DropdownContext);

  useEffect(() => {
    if (!hidden) addItem(id);
    return () => deleteItem(id);
  }, [addItem, deleteItem, hidden, id]);

  return !hidden && <li>{children}</li>;
}
