import React, { useEffect } from "react";

import { RotateCw } from "lucide-react";
import { FallbackProps } from "react-error-boundary";

export function Error({ error, resetErrorBoundary }: Partial<FallbackProps>) {
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on("vite:afterUpdate", onHmr);
      return () => import.meta.hot?.off("vite:afterUpdate", onHmr);
    }

    function onHmr() {
      resetErrorBoundary?.();
    }
  }, [resetErrorBoundary]);

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <p className="mx-8 break-words text-center text-error">Errore: {error.message}</p>
      {resetErrorBoundary && (
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={resetErrorBoundary}>
            <RotateCw />
            Ricarica
          </button>
        </div>
      )}
    </div>
  );
}
