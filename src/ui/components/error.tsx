import React from "react";

import { RotateCw } from "lucide-react";
import { FallbackProps } from "react-error-boundary";

export default function Error({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-full items-center">
      <div className="flex grow flex-col items-center">
        <p className="text-center text-error">Errore: {error.message}</p>
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={resetErrorBoundary}>
            <RotateCw />
            Ricarica
          </button>
        </div>
      </div>
    </div>
  );
}
