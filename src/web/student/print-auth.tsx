import { Fragment, type ReactNode } from "react";

import useSWR from "swr/immutable";
import { Link, Route, Switch, useParams } from "wouter";

import type { Contest, Participation, Student } from "~/models";

import type { VariantsConfig } from "~/models/variants-config";
import { StudentProvider, useStudent } from "./provider";
import { RemoteStatement } from "./remote-statement";
import { UserDataForm } from "./user-data-form";

type AuthProps = {
  children: ReactNode;
};

export function PrintAuth({ children }: AuthProps) {
  return (
    <Switch>
      <Route path="/">
        <VariantList />
      </Route>
      <Route path="/:variantId">
        <VariantProvider>{children}</VariantProvider>
      </Route>
    </Switch>
  );
}

function VariantList() {
  const contests = useContests();

  return (
    <div className="h-dvh overflow-auto">
      <div className="prose mx-auto p-4 lg:max-w-4xl">
        {contests.map((c) => (
          <Fragment key={c.id}>
            <h3>{c.name}</h3>
            <h4>Varianti su carta</h4>
            <ul className="columns-3 first:*:mt-0 lg:columns-4">
              {c.variantIds.map((v) => (
                <li key={v}>
                  <Link href={`/${v}`}>{v}</Link>
                </li>
              ))}
            </ul>
            <h4>Varianti online</h4>
            <ul className="columns-3 first:*:mt-0 lg:columns-4">
              {c.pdfVariantIds.map((v) => (
                <li key={v}>
                  <Link href={`/${v}`}>{v}</Link>
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function VariantProvider({ children }: { children: ReactNode }) {
  const { variantId } = useParams();
  const contests = useContests();

  const contest = contests.find(
    (c) => c.variantIds.includes(variantId!) || c.pdfVariantIds.includes(variantId!),
  );
  if (!contest) {
    return <div>Variante non trovata</div>;
  }

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    name: "",
    teacher: "",
    finalized: false,
    contestId: contest.id,
    disabled: false,
  };

  const student: Student = {
    id: "",
    userData: {},
    answers: {},
    variant: variantId,
  };

  return (
    <StudentProvider
      contest={contest}
      participation={mockParticipation}
      student={student}
      setStudent={() => {}}>
      <UserDataForm />
      {children}
    </StudentProvider>
  );
}

export function PrintStatement() {
  const { student } = useStudent();

  return <RemoteStatement url={`/print-proxy/statement.js?v=${student.variant}`} />;
}

function useContests(): (Contest & VariantsConfig)[] {
  const { data: contests } = useSWR(
    "/print-proxy/contests.json",
    async (url) => {
      const res = await fetch(url);
      return res.json();
    },
    { suspense: true },
  );
  return contests;
}
