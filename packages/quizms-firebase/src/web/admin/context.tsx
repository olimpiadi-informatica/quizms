import { createContext, use } from "react";

import type { Contest, Variant } from "@olinfo/quizms/models";
import type { User } from "firebase/auth";

export type AdminContextProps = {
  user: User;
  name: string;
  contest: Contest;
  contests: Contest[];
  variants: Record<string, Variant>;
};

export const AdminContext = createContext<AdminContextProps>({} as AdminContextProps);
AdminContext.displayName = "AdminContext";

export function useAdmin() {
  return use(AdminContext);
}
