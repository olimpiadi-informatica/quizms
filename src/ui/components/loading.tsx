import React from "react";

import classNames from "classnames";

import Progress from "./progress";

export default function Loading({ className }: { className?: string }) {
  return (
    <div className={classNames("flex items-center", className)}>
      <div className="flex grow flex-col items-center">
        <Progress>
          <p className="pb-1">Caricamento in corso...</p>
        </Progress>
      </div>
    </div>
  );
}
