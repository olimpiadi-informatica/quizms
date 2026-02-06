"use client";

import type { ReactNode } from "react";

export function Contest({ children }: { children: ReactNode }) {
  return (
    <div className="break-before-page">
      <main className="gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
        {children}
      </main>
    </div>
  );
}
