import React, { ReactNode } from "react";

import classNames from "classnames";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={classNames(
        "prose-md prose mx-auto mb-0 mt-5 px-4 print:prose-sm print:mx-1.5 print:max-w-full lg:max-w-4xl",
        "prose-headings:break-after-avoid [&:has(+form)]:prose-p:break-inside-avoid",
      )}>
      {children}
    </div>
  );
}
