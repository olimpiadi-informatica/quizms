import React from "react";

import { BlockMath, InlineMath } from "react-katex";

type MathProps = {
  display?: boolean;
  children: string;
};

export default function Math({ display, children }: MathProps) {
  if (display) {
    return <BlockMath math={children} />;
  } else {
    return <InlineMath math={children} />;
  }
}
