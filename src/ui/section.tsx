import React, { ReactNode, createContext, useContext } from "react";

type SectionProps = {
  id?: string;
  children: ReactNode;
};

const SectionContext = createContext<string>("0");
SectionContext.displayName = "SectionContext";

export function Section({ id, children }: SectionProps) {
  return (
    <SectionContext.Provider value={id ?? "0"}>
      <div className="section gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
        {children}
      </div>
      <hr className="last:hidden" />
    </SectionContext.Provider>
  );
}

export function useSection() {
  return useContext(SectionContext);
}
