import type { ReactNode } from "react";

import { TitleProvider } from "@olinfo/quizms/components";

import { useWebsite } from "~/web/common/website";

export function FirebaseTitleProvider({ children }: { children: ReactNode }) {
  const website = useWebsite();
  return <TitleProvider title={website.title}>{children}</TitleProvider>;
}
