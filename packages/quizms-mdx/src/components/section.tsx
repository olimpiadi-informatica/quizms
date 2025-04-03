import type { ReactNode } from "react";
import { Children } from "react";
import { Rng } from "@olinfo/quizms/utils";

type SectionProps = {
  children: ReactNode;
};

export function Section({ children }: SectionProps) {
  const childrenArray = Children.toArray(children);
  if (process.env.SHUFFLE_PROBLEMS === "TRUE") {
    const rng = new Rng(process.env.QUIZMS_VARIANT_HASH!);
    rng.shuffle(childrenArray);
  }
  return childrenArray;
}

