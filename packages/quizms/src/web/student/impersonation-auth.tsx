import type { ReactNode } from "react";

import { Redirect, useParams } from "wouter";

import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { StudentProvider } from "./provider";

export function ImpersonationAuth({ children }: { children: ReactNode }) {
  const { contest, participation } = useTeacher();
  const [students] = useTeacherStudents();

  const { studentId } = useParams();
  const student = students.find((s) => s.id === studentId);

  if (!student) {
    return <Redirect to="/student" />;
  }

  const fakeRange = { start: new Date(0), end: new Date(0) };

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-base-100">
      <div className="">
        <StudentProvider
          contest={contest}
          participation={{ ...participation, contestWindow: fakeRange }}
          student={{ ...student, contestRange: fakeRange }}
          setAnswer={() => {}}
          submit={() => {}}
          enforceFullscreen={false}>
          {children}
        </StudentProvider>
      </div>
    </div>
  );
}
