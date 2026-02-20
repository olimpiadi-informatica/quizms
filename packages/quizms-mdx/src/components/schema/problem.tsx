import { Children, type ReactNode } from "react";

import { isString } from "lodash-es";

export function Problem({
  points,
  children,
}: {
  points: [number, number, number];
  children: ReactNode;
}) {
  return [
    `"pointsCorrect": ${points[0]}, `,
    `"pointsBlank": ${points[1]}, `,
    `"pointsWrong": ${points[2]}, `,
    `"subProblems": [`,
    children,
    "]",
  ];
}

export function SubProblem({ subId, children }: { subId: number; children: ReactNode }) {
  return [
    "{ ",
    `"subProblemId": ${subId ?? null}, `,
    Children.toArray(children).filter((child) => !isString(child)),
    "}, ",
  ];
}
