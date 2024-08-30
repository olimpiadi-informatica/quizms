import { Suspense, lazy, useEffect } from "react";

import { Button } from "@olinfo/react-components";
import type { StackFrameLite } from "error-stack-parser-es/lite";
import { RotateCw } from "lucide-react";
import {
  ErrorBoundary as BaseErrorBoundary,
  type ErrorBoundaryPropsWithComponent,
  type FallbackProps,
} from "react-error-boundary";

const FrameCode = lazy(() => import("./frame"));

export class FrameError extends Error {
  constructor(
    message: string,
    public frame: StackFrameLite,
    cause?: Error,
  ) {
    super(message, { cause });
  }
}

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
    <div className="not-prose text-base flex w-full grow flex-col items-center justify-center p-4 gap-4">
      <p className="break-words text-center text-error font-bold">Errore: {error.message}</p>
      {resetErrorBoundary && (
        <Button className="btn-error" icon={RotateCw} onClick={() => resetErrorBoundary()}>
          Ricarica
        </Button>
      )}
      {import.meta.env.DEV && (
        <Suspense>
          <FrameCode error={error} />
        </Suspense>
      )}
    </div>
  );
}
