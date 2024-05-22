import { ReactNode } from "react";

import { MDXProvider } from "@mdx-js/react";
import clsx from "clsx";

import { components } from "./index";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <MDXProvider components={components}>
      <div
        className={clsx(
          "prose prose-lg max-w-full",
          "prose-table:mx-auto prose-table:w-auto prose-table:text-center",
          "print:prose-sm print:prose-headings:mt-2 print:prose-hr:my-4",
          "prose-headings:break-inside-avoid prose-headings:break-after-avoid",
          "prose-p:break-inside-avoid prose-ul:break-before-avoid prose-ul:break-inside-avoid",
        )}>
        {children}
      </div>
    </MDXProvider>
  );
}
