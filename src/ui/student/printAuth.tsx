import React, { ComponentType, ReactNode } from "react";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student } from "~/models/student";

import { Layout } from "./layout";
import { StudentProvider } from "./provider";

type AuthProps = {
  contestName: string;
  duration: number;
  children: ReactNode;

  // Da rimuovere
  header: ComponentType<any>;
};

export function PrintAuth({ header: Header, contestName, children }: AuthProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const variant = urlParams.get("variant") ?? "";
  const submitted = false;

  const startTime = undefined;

  const mockContest: Contest = {
    id: "id-finto",
    name: contestName,
    problemIds: [],
    personalInformation: [
      { name: "name", label: "Nome", type: "text" },
      { name: "surname", label: "Cognome", type: "text" },
    ],
    hasVariants: true,
    allowStudentRegistration: false,
    allowRestart: true,
  };

  const mockSchool: School = {
    id: "",
    schoolId: "finto id",
    name: "Nessuna scuola",
    teacher: "",
    startingTime: startTime,
    finalized: false,
    contestId: "id-finto",
  };

  const student: Student = {
    id: "",
    personalInformation: {},
    answers: {},
  };

  return (
    <StudentProvider
      contest={mockContest}
      school={mockSchool}
      student={student}
      setStudent={async () => {}}
      variant={variant}
      submit={() => {}}
      terminated={submitted}>
      <Layout>{children}</Layout>
    </StudentProvider>
  );
}
