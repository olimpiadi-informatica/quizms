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

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-base-100">
      <div className="">
        <StudentProvider
          contest={contest}
          participation={{ ...participation, startingTime: new Date(0) }}
          student={{ ...student, finishedAt: new Date(0) }}
          setStudent={() => {}}
          reset={() => {}}
          disableFullscreen={true}>
          {children}
        </StudentProvider>
      </div>
    </div>
  );
}
