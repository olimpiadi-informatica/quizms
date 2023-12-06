import React, { ReactNode } from "react";

type SectionProps = {
  children: ReactNode;
};

export function Section({ children }: SectionProps) {
  return (
    <>
      <div className="section gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
        {children}
      </div>
      <hr className="last:hidden" />
    </>
  );
}
