import React, { ReactNode } from "react";

import classNames from "classnames";

type ProgressBlockProps = {
  percentage: number;
  children: ReactNode;
  className?: string;
};

export default function ProgressBlock({ percentage, className, children }: ProgressBlockProps) {
  percentage = Math.round(percentage);
  if (isNaN(percentage)) {
    percentage = 100;
  }
  return (
    <div
      className={classNames("text-white text-center rounded-lg p-2", className)}
      style={{
        background: `linear-gradient(to right, #3b82f6 ${percentage}%, #71717a ${percentage}%)`,
      }}>
      {children}
    </div>
  );
}
