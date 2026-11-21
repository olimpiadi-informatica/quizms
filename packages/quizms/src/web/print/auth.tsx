import { Fragment, type ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Link, Route, Switch } from "wouter";

import type { Contest, Student, Venue } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { StudentForm } from "~/web/components/student-form";
import { useLocalize } from "~/web/components/ui-language-provider";
import { StudentProvider } from "~/web/student/provider";

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
  const localize = useLocalize();
  return (
    <div className="h-dvh overflow-auto">
      <div className="prose mx-auto p-4 lg:max-w-4xl">
        {contests.map((c) => (
          <Fragment key={c.id}>
            <h3>{localize(c.name)}</h3>
            {c.variantIds.length > 0 && (
              <>
                <h4>
                  <Trans>Online variants</Trans>
                </h4>
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
                <h4>
                  <Trans>Paper variants</Trans>
                </h4>
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

export function PrintProvider({
  contest,
  statementFiles,
  children,
}: {
  contest: Contest;
  /** Statement file of each language (e.g. `statement.en.txt`), chosen by `quizms print` */
  statementFiles?: Record<string, string>;
  children: ReactNode;
}) {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("lang");
  const language =
    requested && contest.languages.includes(requested) ? requested : contest.languages[0];

  const student: Student = {
    id: "",
    userData: {
      name: "",
      surname: "",
    },
    answers: {},
    contestId: contest.id,
    variantId: params.get("v") ?? "",
  };

  const mockVenue: Venue = {
    id: "",
    schoolId: "",
    contestId: contest.id,
    name: "",
    participationWindow: {
      start: new Date(0),
      end: new Date(1e13),
    },
    finalized: false,
    disabled: false,
    pdfVariants: [],
  };

  return (
    <StudentProvider
      contest={contest}
      venue={mockVenue}
      student={student}
      language={language}
      setAnswer={() => {}}
      submit={() => {}}
      enforceFullscreen={false}>
      <StudentForm printLayout />
      {children}
      <PrintStatement file={statementFiles?.[language] ?? "statement.txt"} />
    </StudentProvider>
  );
}
PrintProvider.displayName = "PrintProvider";
