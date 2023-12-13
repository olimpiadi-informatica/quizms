import React, { ReactNode } from "react";

import { MDXProvider } from "@mdx-js/react";
import classNames from "classnames";

import { components } from "../mdxComponents";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <MDXProvider components={components}>
      <div
        className={classNames(
          "prose prose-lg mx-auto mb-0 mt-5 px-4 print:prose-sm print:max-w-full print:text-xs lg:max-w-4xl",
          "prose-headings:break-after-avoid prose-table:text-center [&:has(+form)]:prose-p:break-inside-avoid",
          "print:prose-headings:mt-2 print:prose-hr:my-4",
        )}>
        {children}
      </div>
    </MDXProvider>
  );
}
