import React, { Children, ReactNode, createContext, useContext } from "react";

import { useAuthentication } from "~/ui/auth/provider";
import { Rng } from "~/utils/random";

type SectionProps = {
  id?: string;
  children: ReactNode;
};

const SectionContext = createContext<string>("0");
SectionContext.displayName = "SectionContext";

export function Section({ id, children }: SectionProps) {
  const { variant } = useAuthentication();

  const rng = new Rng(`r#section#${variant}#${id}`);

  const problems = Children.toArray(children);
  if (import.meta.env.PROD) rng.shuffle(problems);

  return (
    <SectionContext.Provider value={id ?? "0"}>
      <div className="section gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
        {problems}
      </div>
      <hr className="last:hidden" />
    </SectionContext.Provider>
  );
}

export function useSection() {
  return useContext(SectionContext);
}
