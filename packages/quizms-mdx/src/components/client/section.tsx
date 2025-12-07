"use client";

import { Children } from "react";

import type { SectionProps } from "../server/section";
import { ProblemContext } from "./problem";

export function Section({ problemIds, children }: SectionProps) {
  return Children.toArray(children).map((child, i) => {
    return (
      <ProblemContext.Provider key={i} value={{ id: problemIds[i], points: [0, 0, 0] }}>
        {child}
      </ProblemContext.Provider>
    );
  });
}
