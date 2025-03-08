import type { ReactNode } from "react";

import clsx from "clsx";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={clsx(
        "prose prose-lg max-w-full",
        "has-[img]:prose-p:flex has-[img]:prose-p:justify-center prose-img:m-0",
        "prose-table:mx-auto prose-table:w-auto prose-table:text-center",
        "print:prose-sm print:prose-headings:mt-2 print:prose-hr:my-4",
        "prose-headings:break-inside-avoid prose-headings:break-after-avoid",
        "prose-p:break-inside-avoid prose-ul:break-before-avoid prose-ul:break-inside-avoid",
      )}>
      {children}
    </div>
  );
}
