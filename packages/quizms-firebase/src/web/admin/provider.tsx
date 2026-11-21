import { lazy, useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { UiLanguageScope, useLocalize } from "@olinfo/quizms/components";
import type { Contest, Variant } from "@olinfo/quizms/models";
import { contestsLanguages } from "@olinfo/quizms/utils";
import { Link, Redirect, Route, Switch, useParams } from "wouter";

import { AdminContext } from "./context";
import { AdminLayout } from "./layout";
import { SchoolTable } from "./school-table";

type AdminProviderProps = {
  name: string;
  contests: Contest[];
  variants: Variant[];
  setContest: (contest: Contest) => Promise<void>;
  logout: () => Promise<void>;
};

export function AdminProvider({
  name,
  contests,
  setContest,
  logout,
  ...props
}: AdminProviderProps) {
  // The UI can be in any language of the contests.
  const languages = useMemo(() => contestsLanguages(contests), [contests]);

  return (
    <UiLanguageScope languages={languages}>
      <AdminLayout name={name} contests={contests} logout={logout}>
        <Route path="/">
          {contests.length === 1 && <Redirect to={`/${contests[0].id}`} />}
          {contests.length === 0 ? (
            <div className="flex w-full grow flex-col items-center justify-center gap-4">
              <p className="text-2xl">
                <Trans>No contests found</Trans>
              </p>
            </div>
          ) : (
            <div className="flex w-full grow flex-col items-center justify-center gap-4">
              <p className="text-2xl">
                <Trans>Select a contest</Trans>
              </p>
              <ContestLinks contests={contests} />
            </div>
          )}
        </Route>
        <Route path="/:contestId" nest>
          <ProviderInner
            name={name}
            contests={contests}
            setContest={setContest}
            logout={logout}
            {...props}
          />
        </Route>
      </AdminLayout>
    </UiLanguageScope>
  );
}

/** Links to the contests, in the UI language of the scope. */
function ContestLinks({ contests }: { contests: Contest[] }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {contests.map((c) => (
        <Link key={c.id} className="btn btn-primary" href={`/${c.id}`}>
          {localize(c.name)}
        </Link>
      ))}
    </div>
  );
}

const Dashboard = lazy(() => import("./dashboard"));

function ProviderInner({ contests, variants, ...props }: AdminProviderProps) {
  const { contestId } = useParams();

  const contest = contests.find((c) => c.id === contestId);
  if (!contest) {
    return <Redirect to="/" />;
  }

  const contestVariants = Object.fromEntries(
    variants.filter((v) => v.contestId === contest?.id).map((v) => [v.id, v]),
  );

  return (
    <AdminContext.Provider value={{ ...props, variants: contestVariants, contest, contests }}>
      <Switch>
        <Route path="/">
          <Dashboard />
        </Route>
        <Route path="/schools">
          <SchoolTable />
        </Route>
      </Switch>
    </AdminContext.Provider>
  );
}
