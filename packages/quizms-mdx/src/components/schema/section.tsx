import type { ReactNode } from "react";

import { shuffleChildren } from "~/components/utils";

export function Section({
  firstProblemId,
  children,
}: {
  firstProblemId: number;
  children: ReactNode;
}) {
  const [childrenNodes, ids] = shuffleChildren(children, "problems", firstProblemId);

  return childrenNodes.map((child, i) => [
    "{ ",
    `"id": ${JSON.stringify(firstProblemId + i)}, `,
    `"originalId": ${JSON.stringify(firstProblemId + ids[i])}, `,
    child,
    "},",
  ]);
}
