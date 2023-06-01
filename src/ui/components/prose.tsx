import React, { ReactNode } from "react";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-md prose mx-auto mt-5 mb-0 px-4 dark:prose-invert print:prose-sm print:mx-1.5 print:max-w-full lg:max-w-4xl">
      {children}
    </div>
  );
}
