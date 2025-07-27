import { lazy, Suspense, useEffect } from "react";

import { Trans } from "@lingui/react/macro";
import { Button } from "@olinfo/react-components";
import { RotateCw, TriangleAlert } from "lucide-react";
import {
  ErrorBoundary as BaseErrorBoundary,
  type ErrorBoundaryPropsWithComponent,
  type FallbackProps,
} from "react-error-boundary";

export { useErrorBoundary } from "react-error-boundary";

const FrameCode = process.env.NODE_ENV === "development" && lazy(() => import("./frame"));

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
    const reload = () => window.location.reload();

    import.meta.hot?.on("vite:afterUpdate", reload);
    return () => import.meta.hot?.off("vite:afterUpdate", reload);
  }, []);

  return (
    <div className="not-prose text-base-content text-base flex w-full grow flex-col items-center justify-center p-4 gap-4">
      <div className="text-center">
        <div className="text-lg font-bold">
          <Trans>Error</Trans>
        </div>
        <div className="text-base-content/80">
          <Trans>An error occurred in the application.</Trans>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-red-200 dark:bg-error text-red-900 dark:text-error-content text-lg font-medium p-4 rounded-lg">
        <TriangleAlert size={16} />
        <div className="break-words">{error.message}</div>
      </div>
      {resetErrorBoundary && (
        <Button className="btn-ghost" icon={RotateCw} onClick={() => resetErrorBoundary()}>
          <Trans>Reload</Trans>
        </Button>
      )}
      {FrameCode && (
        <Suspense>
          <FrameCode error={error} />
        </Suspense>
      )}
    </div>
  );
}
