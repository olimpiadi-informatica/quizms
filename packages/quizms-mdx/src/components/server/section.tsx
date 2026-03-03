import type { ReactNode } from "react";

import { shuffleChildren } from "~/components/utils";

import { Section as SectionClient } from "../client/section";

export function Section({
  firstProblemId,
  children,
}: {
  firstProblemId: number;
  children: ReactNode;
}) {
  const [childrenNodes] = shuffleChildren(children, "problems", firstProblemId);
  return <SectionClient firstProblemId={firstProblemId}>{childrenNodes}</SectionClient>;
}
Section.displayName = "Section";
