import { createContext, use } from "react";

import type { Contest } from "@olinfo/quizms/models";

export type AdminContextProps = {
  name: string;
  contest: Contest;
  contests: Contest[];
  setContest: (contest: Contest) => Promise<void>;
};

export const AdminContext = createContext<AdminContextProps>({} as AdminContextProps);
AdminContext.displayName = "AdminContext";

export function useAdmin() {
  return use(AdminContext);
}
