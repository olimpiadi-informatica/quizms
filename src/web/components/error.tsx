import { useEffect } from "react";

import { Button } from "@olinfo/react-components";
import { RotateCw } from "lucide-react";
import {
  ErrorBoundary as BaseErrorBoundary,
  type ErrorBoundaryPropsWithComponent,
  type FallbackProps,
} from "react-error-boundary";

export function ErrorBoundary({
  children,
  ...props
}: Omit<ErrorBoundaryPropsWithComponent, "FallbackComponent">) {
  return (
    <BaseErrorBoundary {...props} FallbackComponent={ErrorBoundaryContent}>
      {children}
    </BaseErrorBoundary>
  );
}

function ErrorBoundaryContent({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    import.meta.hot?.on("vite:afterUpdate", resetErrorBoundary);
    return () => import.meta.hot?.off("vite:afterUpdate", resetErrorBoundary);
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
