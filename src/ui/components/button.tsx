import React, { ComponentType, createContext, useContext, useId, useState } from "react";
import { ReactNode } from "react";

import classNames from "classnames";

type ContextProps = {
  loading?: string;
  setLoading: (value?: string) => void;
};

const LoadingButtonsContext = createContext({
  loading: undefined,
  setLoading: () => {},
} as ContextProps);

export function LoadingButtons({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<string>();

  return (
    <LoadingButtonsContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoadingButtonsContext.Provider>
  );
}

type ButtonProps = {
  className?: string;
  icon?: ComponentType;
  onClick?: () => Promise<void> | void;
  disabled?: boolean;
  children: ReactNode;
};

export function Button({ className, icon: Icon, onClick, disabled, children }: ButtonProps) {
  const { loading, setLoading } = useContext(LoadingButtonsContext);

  const id = useId();
  const spinning = loading === id;

  const handleClick = async () => {
    setLoading(id);
    try {
      await onClick?.();
      setLoading(undefined);
    } catch (e) {
      setLoading(undefined);
      throw e;
    }
  };

  return (
    <button
      className={classNames("btn", className)}
      onClick={handleClick}
      disabled={!!loading || disabled}>
      {spinning && <span className="loading loading-spinner" />}
      {!spinning && Icon && <Icon />}
      {children}
    </button>
  );
}
