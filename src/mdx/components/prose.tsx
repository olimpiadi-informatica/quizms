import React, { ReactNode } from "react";

import { MDXProvider } from "@mdx-js/react";
import classNames from "classnames";

import { components } from "./index";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <MDXProvider components={components}>
      <div
        className={classNames(
          "prose prose-lg mx-auto my-5 px-4 print:prose-sm screen:pb-10 lg:max-w-4xl print:max-w-full print:text-xs",
          "prose-table:text-center print:prose-headings:mt-2 print:prose-hr:my-4",
          "prose-headings:break-after-avoid prose-p:break-inside-avoid prose-ul:break-before-avoid prose-ul:break-inside-avoid",
        )}>
        {children}
      </div>
    </MDXProvider>
  );
}
