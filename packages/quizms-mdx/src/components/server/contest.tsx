import type { ReactNode } from "react";

import { Contest as ContestClient } from "../client/contest";
import { JsonArray } from "./json";

export function Contest({ children }: { children: ReactNode }) {
  return (
    <JsonArray>
      <ContestClient>{children}</ContestClient>
    </JsonArray>
  );
}
Contest.displayName = "Contest";
