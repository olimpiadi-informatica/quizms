import React from "react";

import Progress from "./progress";

export default function Loading() {
  return (
    <div className="flex h-full items-center">
      <div className="flex grow flex-col items-center">
        <Progress>
          <p className="pb-1">Caricamento in corso...</p>
        </Progress>
      </div>
    </div>
  );
}
