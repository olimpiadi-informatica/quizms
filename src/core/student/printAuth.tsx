import React, { ReactNode } from "react";

import { Contest, School, Student } from "~/models";

import { StudentProvider } from "./provider";

type AuthProps = {
  headers: Record<string, Contest>;
};

export function PrintAuth({ headers }: AuthProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const variant = urlParams.get("variant") ?? "";
  const submitted = false;

  const startTime = undefined;

  const mockSchool: School = {
    id: "",
    schoolId: "finto id",
    name: "Nessuna scuola",
    teacher: "",
    startingTime: startTime,
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
      school={mockSchool}
      student={student}
      setStudent={async () => {}}
      submit={() => {}}
      terminated={submitted}>
      <PrintForm contest={contest} variant={variant} />
      {children}
    </StudentProvider>
  );
}

function PrintForm({ contest, variant }: { contest: Contest; variant: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 pb-10">
      {contest.personalInformation.map((field) => (
        <div key={field.name} className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">{field.label}</span>
          </label>
          <input type="text" className="input input-bordered w-full max-w-md" />
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
            value={variant}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
