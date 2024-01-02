import React from "react";

import { RotateCw } from "lucide-react";
import { FallbackProps } from "react-error-boundary";

export default function Error({ error, resetErrorBoundary }: Partial<FallbackProps>) {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <p className="break-words text-center text-error">Errore: {error.message}</p>
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
