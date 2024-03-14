import React, {
  ComponentType,
  MouseEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
} from "react";

import classNames from "classnames";
import { FirebaseError } from "firebase/app";

type ContextProps = {
  contextLoading?: string;
  setContextLoading?: (value?: string) => void;
  throwError?: (error?: Error) => void;
};

const LoadingButtonsContext = createContext<ContextProps>({});
LoadingButtonsContext.displayName = "LoadingButtonsContext";

export function Buttons({
  className,
  showError,
  children,
}: {
  className?: string;
  showError?: boolean;
  children: ReactNode;
}) {
  const [contextLoading, setContextLoading] = useState<string>();
  const [error, setError] = useState<string>();

  const throwError = useCallback(
    (error?: Error) => {
      if (error) {
        console.error(error);
        if (showError) {
          setError(`Errore: ${cleanFirebaseError(error)}`);
        }
      }
    },
    [showError],
  );

  return (
    <LoadingButtonsContext.Provider value={{ contextLoading, setContextLoading, throwError }}>
      <div className={classNames("not-prose", className)}>
        {showError && <p className="mb-1.5 text-error">{error || <>&nbsp;</>}</p>}
        <div className="flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </LoadingButtonsContext.Provider>
  );
}

function cleanFirebaseError(error: Error) {
  if (!(error instanceof FirebaseError)) {
    return error.message;
  }

  switch (error.code) {
    case "auth/invalid-email":
    case "auth/user-not-found":
      return "Username non corretto.";
    case "auth/wrong-password":
      return "Password non corretta.";
    case "auth/too-many-requests":
      return "Troppi tentativi. Riprova più tardi.";
    default:
      return error.message.replace(/^Firebase: /, "").replace(/ \([/a-z-]+\)\.$/, "");
  }
}

type ButtonProps = {
  className?: string;
  icon?: ComponentType;
  onClick?: () => Promise<void> | void;
  disabled?: boolean;
  children: ReactNode;
};

export function Button({ className, icon: Icon, onClick, disabled, children }: ButtonProps) {
  const { contextLoading, setContextLoading, throwError } = useContext(LoadingButtonsContext);
  const [localLoading, setLocalLoading] = useState<string>();

  const loading = contextLoading ?? localLoading;

  const setLoading = (value?: string) => {
    (setContextLoading ?? setLocalLoading)(value);
  };

  const id = useId();
  const spinning = loading === id;

  const handleClick = async (e: MouseEvent) => {
    if (!onClick) return;

    e.preventDefault();
    setLoading(id);
    throwError?.();
    try {
      await onClick();
    } catch (err) {
      throwError?.(err as Error);
    }
    setLoading(undefined);
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
