import type { ReactNode } from "react";

export function Contest({ children }: { children: ReactNode }) {
  return ["[ ", children, "]"];
}
