import { useEffect } from "react";

import { Button } from "@olinfo/react-components";
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
    <div className="flex w-full grow flex-col items-center justify-center gap-4">
      <p className="break-words text-center text-error">Errore: {error.message}</p>
      {resetErrorBoundary && (
        <Button className="btn-error" icon={RotateCw} onClick={() => resetErrorBoundary()}>
          Ricarica
        </Button>
      )}
    </div>
  );
}
