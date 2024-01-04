import React from "react";

import Progress from "./progress";

export default function Loading() {
  return (
    <div className="not-prose flex h-full items-center justify-center">
      <Progress>
        <p className="pb-1">Caricamento in corso...</p>
      </Progress>
    </div>
  );
}
