"use client";

import type { ReactNode } from "react";

export type SectionProps = {
  children: ReactNode;
};

export function Section({ children }: SectionProps) {
  return children;
}
Section.displayName = "Section";
