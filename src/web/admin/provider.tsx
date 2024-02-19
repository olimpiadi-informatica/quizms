import React, { ReactNode, createContext, useContext } from "react";

import { Loading } from "~/components";
import useHash from "~/components/hash";
import { Contest } from "~/models";

import { AdminLayout } from "./layout";

type AdminContextProps = {
  contest: Contest;
  setContest: (contest: Contest) => Promise<void>;
};

const AdminContext = createContext<AdminContextProps>({} as AdminContextProps);
AdminContext.displayName = "AdminContext";

type AdminProviderProps = {
  contests: Contest[];
  setContest: (contest: Contest) => Promise<void>;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminProvider({ contests, setContest, logout, children }: AdminProviderProps) {
  const contestId = useHash(contests.length === 1 ? contests[0]?.id : undefined);
  const contest = contests.find((c) => c.id === contestId)!;

  if (contestId === undefined) {
    return <Loading />;
  }

  return (
    <AdminLayout contests={contests} activeContest={contest} logout={logout}>
      <AdminContext.Provider value={{ contest, setContest }}>{children}</AdminContext.Provider>
    </AdminLayout>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
