import { Fragment, type ReactNode } from "react";

import { Link, Route, Switch } from "wouter";

import type { Contest, Participation, Student } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { StudentProvider } from "~/web/student/provider";
import { UserDataForm } from "~/web/student/user-data-form";

import { PrintStatement } from "./statement";

export function PrintRoutes({
  contests,
  children,
}: {
  contests: (Contest & VariantsConfig)[];
  children: ReactNode;
}) {
  return (
    <Switch>
      <Route path="/">
        <VariantList contests={contests} />
      </Route>
      {children}
    </Switch>
  );
}
PrintRoutes.displayName = "PrintRoutes";

function VariantList({ contests }: { contests: (Contest & VariantsConfig)[] }) {
  return (
    <div className="h-dvh overflow-auto">
      <div className="prose mx-auto p-4 lg:max-w-4xl">
        {contests.map((c) => (
          <Fragment key={c.id}>
            <h3>{c.name}</h3>
            {c.variantIds.length > 0 && (
              <>
                <h4>Varianti online</h4>
                <ul className="columns-3 first:*:mt-0 lg:columns-4">
                  {c.variantIds.map((v) => (
                    <li key={v}>
                      <Link href={`/${c.id}?v=${v}`}>{v}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {c.pdfVariantIds.length > 0 && (
              <>
                <h4>Varianti su carta</h4>
                <ul className="columns-3 first:*:mt-0 lg:columns-4">
                  {c.pdfVariantIds.map((v) => (
                    <li key={v}>
                      <Link href={`/${c.id}?v=${v}`}>{v}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
VariantList.displayName = "VariantList";

export function PrintProvider({ contest, children }: { contest: Contest; children: ReactNode }) {
  const student: Student = {
    id: "",
    userData: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    contestId: contest.id,
    variant: new URLSearchParams(window.location.search).get("v") ?? "",
  };

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    contestId: contest.id,
    name: "",
    teacher: "",
    finalized: false,
    disabled: false,
  };

  return (
    <StudentProvider
      contest={contest}
      participation={mockParticipation}
      student={student}
      setStudent={() => {}}>
      <UserDataForm />
      {children}
      <PrintStatement />
    </StudentProvider>
  );
}
PrintProvider.displayName = "PrintProvider";
