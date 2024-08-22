import { Fragment, type ReactNode } from "react";

import contests from "virtual:quizms-contests";

import type { Participation, Student } from "~/models";

import { StudentProvider, useStudent } from "./provider";
import { RemoteStatement } from "./remote-statement";

type AuthProps = {
  children: ReactNode;
};

export function PrintAuth({ children }: AuthProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const variant = urlParams.get("v");

  const allContests = contests();
  const contest = allContests.find(
    (c) => c.variantIds.includes(variant!) || c.pdfVariantIds.includes(variant!),
  );

  if (!variant || !contest) {
    return (
      <div className="h-dvh overflow-auto">
        <div className="prose mx-auto p-4 lg:max-w-4xl">
          {variant && <h3 className="text-error">Variante non trovata.</h3>}
          {allContests.map((c) => (
            <Fragment key={c.id}>
              <h3>{c.name}</h3>
              <h4>Varianti su carta</h4>
              <ul className="columns-3 first:*:mt-0 lg:columns-4">
                {c.variantIds.map((v) => (
                  <li key={v}>
                    <a href={`?v=${v}`}>{v}</a>
                  </li>
                ))}
              </ul>
              <h4>Varianti online</h4>
              <ul className="columns-3 first:*:mt-0 lg:columns-4">
                {c.pdfVariantIds.map((v) => (
                  <li key={v}>
                    <a href={`?v=${v}`}>{v}</a>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    name: "",
    teacher: "",
    finalized: false,
    contestId: contest.id,
  };

  const student: Student = {
    id: "",
    userData: {},
    answers: {},
    variant,
  };

  return (
    <StudentProvider
      contest={contest}
      participation={mockParticipation}
      student={student}
      setStudent={() => {}}>
      {children}
    </StudentProvider>
  );
}

export function PrintStatement() {
  const { student } = useStudent();

  return <RemoteStatement url={`/pdf/statement.js?v=${student.variant}`} />;
}
