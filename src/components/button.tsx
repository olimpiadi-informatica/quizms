import React, { ComponentType, ReactNode, createContext, useContext, useId, useState } from "react";

import classNames from "classnames";

type ContextProps = {
  contextLoading?: string;
  setContextLoading?: (value?: string) => void;
};

const LoadingButtonsContext = createContext<ContextProps>({});

export function LoadingButtons({ children }: { children: ReactNode }) {
  const [contextLoading, setContextLoading] = useState<string>();

  return (
    <LoadingButtonsContext.Provider value={{ contextLoading, setContextLoading }}>
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
  const { contextLoading, setContextLoading } = useContext(LoadingButtonsContext);
  const [localLoading, setLocalLoading] = useState<string>();

  const loading = contextLoading ?? localLoading;

  const setLoading = (value?: string) => {
    (setContextLoading ?? setLocalLoading)(value);
  };

  const id = useId();
  const spinning = loading === id;

  const handleClick = async () => {
    setLoading(id);
    try {
      await onClick?.();
    } finally {
      setLoading(undefined);
    }
  };

  return (
    <button
      className={classNames("btn", className)}
      onClick={handleClick}
      type={onClick ? "button" : "submit"}
      disabled={!!loading || disabled}>
      {spinning && <span className="loading loading-spinner" />}
      {!spinning && Icon && <Icon />}
      {children}
    </button>
  );
}
