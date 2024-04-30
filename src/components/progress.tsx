import { ReactNode } from "react";

import classNames from "classnames";
import { clamp } from "lodash-es";

type ProgressBlockProps = {
  percentage?: number;
  children: ReactNode;
  className?: string;
};

export function Progress({ percentage, className, children }: ProgressBlockProps) {
  let value = percentage === undefined ? undefined : Math.round(percentage);
  if (value !== undefined) {
    value = Number.isNaN(value) ? undefined : clamp(value, 0, 100);
  }

  return (
    <div className={classNames("relative p-2 pt-0 text-center", className)}>
      <div className="relative z-10">{children}</div>
      <progress className="progress progress-info absolute inset-x-0" value={value} max="100" />
    </div>
  );
}
