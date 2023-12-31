import React, { ReactNode } from "react";

// @ts-expect-error: virtual module doesn't have a type declaration
import contests from "virtual:quizms-contests";

import { RemoteStatement } from "~/core/student/remoteStatement";
import { Participation, Student } from "~/models";
import { GenerationConfig } from "~/models/generation-config";

import { StudentProvider, useStudent } from "./provider";

type AuthProps = {
  children: ReactNode;
};

export function PrintAuth({ children }: AuthProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const variant = urlParams.get("v");

  const allContests = contests() as GenerationConfig[];
  const contest = allContests.find(
    (c) => c.variantIds.includes(variant!) || c.pdfVariantIds.includes(variant!),
  );

  if (!variant || !contest) {
    return (
      <div className="h-dvh overflow-auto">
        <div className="prose mx-auto p-4 lg:max-w-4xl">
          {variant && <h3 className="text-error">Variante non trovata.</h3>}
          {allContests.map((c) => (
            <>
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
            </>
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
    personalInformation: {},
    answers: {},
    variant,
  };

  return (
    <StudentProvider
      contest={contest}
      participation={mockParticipation}
      student={student}
      setStudent={async () => {}}
      submit={() => {}}
      terminated={false}>
      {children}
    </StudentProvider>
  );
}

export function PrintForm() {
  const { contest, student } = useStudent();

  return (
    <div className="grid grid-cols-2 gap-2 pb-10">
      {contest.personalInformation.map((field) => (
        <div key={field.name} className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">{field.label}</span>
          </label>
          <input type="text" className="input input-bordered w-full max-w-md" readOnly />
        </div>
      ))}
      {contest.hasVariants && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Variante</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full max-w-md"
            value={student.variant}
            readOnly
          />
        </div>
      )}
    </div>
  );
}

export function PrintStatement() {
  const { student } = useStudent();

  return <RemoteStatement url={`/pdf/statement.js?v=${student.variant}`} />;
}
