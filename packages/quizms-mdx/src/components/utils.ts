import { Children, type ReactNode } from "react";

import { shuffle } from "@olinfo/quizms/utils";

export function shuffleChildren(
  children: ReactNode,
  seed1: "answers" | "problems",
  seed2: string | number,
) {
  const childrenNodes = Children.toArray(children);
  const ids = childrenNodes.map((_, i) => i);
  if (
    (seed1 === "answers" && process.env.QUIZMS_SHUFFLE_ANSWERS === "true") ||
    (seed1 === "problems" && process.env.QUIZMS_SHUFFLE_PROBLEMS === "true")
  ) {
    const fullSeed = [process.env.QUIZMS_VARIANT_HASH, seed1, seed2].join("-");
    shuffle(childrenNodes, fullSeed);
    shuffle(ids, fullSeed);
  }

  return [childrenNodes, ids] as const;
}
