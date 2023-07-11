import React, { ReactNode } from "react";

export default function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-md prose mx-auto mb-0 mt-5 px-4 print:prose-sm print:mx-1.5 print:max-w-full lg:max-w-4xl">
      {children}
    </div>
  );
}
