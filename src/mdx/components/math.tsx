import React, { useEffect, useRef } from "react";

import katex from "katex";

import "katex/dist/katex.css";

type MathProps = {
  display?: boolean;
  children: string;
};

export default function Math({ display, children }: MathProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      katex.render(children, ref.current, { displayMode: display });
    }
  }, [ref, children, display]);

  return <span ref={ref} />;
}
