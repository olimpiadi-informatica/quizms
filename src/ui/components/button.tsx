import React, { ReactNode } from "react";

import classNames from "classnames";

type ButtonProps = {
  className?: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

export default function Button({ className, onClick, disabled, children }: ButtonProps) {
  return (
    <button
      className={classNames(
        "rounded-lg border py-2 px-3 transition",
        { "hover:scale-110": !disabled },
        className
      )}
      onClick={onClick}
      disabled={disabled}>
      {children}
    </button>
  );
}
