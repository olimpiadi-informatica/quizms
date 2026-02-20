import type { ReactNode } from "react";

import { shuffleChildren } from "~/components/utils";

import { ProblemProvider } from "../client/problem";
import { Section as SectionClient } from "../client/section";

export function Section({
  firstProblemId,
  children,
}: {
  firstProblemId: number;
  children: ReactNode;
}) {
  const [childrenNodes] = shuffleChildren(children, "problems", firstProblemId);
  return (
    <SectionClient>
      {childrenNodes.map((child, i) => (
        <ProblemProvider key={i} id={`${firstProblemId + i}`}>
          {child}
        </ProblemProvider>
      ))}
    </SectionClient>
  );
}
Section.displayName = "Section";
