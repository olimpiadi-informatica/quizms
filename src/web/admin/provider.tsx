import { createContext, lazy, useContext } from "react";

import { Link, Redirect, Route, useParams } from "wouter";

import type { Contest } from "~/models";

import { AdminLayout } from "./layout";

type AdminContextProps = {
  name: string;
  contest: Contest;
  contests: Contest[];
  setContest: (contest: Contest) => Promise<void>;
};

const AdminContext = createContext<AdminContextProps>({} as AdminContextProps);
AdminContext.displayName = "AdminContext";

type AdminProviderProps = {
  name: string;
  contests: Contest[];
  setContest: (contest: Contest) => Promise<void>;
  logout: () => Promise<void>;
};

export function AdminProvider({ name, contests, setContest, logout }: AdminProviderProps) {
  return (
    <AdminLayout name={name} contests={contests} logout={logout}>
      <Route path="/">
        <div className="flex w-full grow flex-col items-center justify-center gap-4">
          <p className="text-2xl">Seleziona una gara</p>
          <div className="flex flex-wrap justify-center gap-2">
            {contests.map((c) => (
              <Link key={c.id} className="btn btn-primary" href={`/${c.id}/`}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </Route>
      <Route path="/:contestId" nest>
        <ProviderInner name={name} contests={contests} setContest={setContest} logout={logout} />
      </Route>
    </AdminLayout>
  );
}

const Dashboard = lazy(() => import("./dashboard"));

function ProviderInner({ contests, ...props }: AdminProviderProps) {
  const { contestId } = useParams();

  const contest = contests.find((c) => c.id === contestId);
  if (!contest) {
    return <Redirect to="/" />;
  }

  return (
    <AdminContext.Provider value={{ ...props, contest, contests }}>
      <Dashboard />
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
