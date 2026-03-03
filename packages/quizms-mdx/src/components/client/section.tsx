"use client";

import { Children, type ReactNode } from "react";

import { ProblemProvider } from "~/components/client/problem";

export function Section({
  firstProblemId,
  children,
}: {
  firstProblemId: number;
  children: ReactNode;
}) {
  return Children.toArray(children).map((child, i) => (
    <ProblemProvider key={i} id={`${firstProblemId + i}`}>
      {child}
    </ProblemProvider>
  ));
}
Section.displayName = "Section";
