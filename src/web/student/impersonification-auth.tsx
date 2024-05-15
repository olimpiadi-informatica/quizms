import { ReactNode } from "react";

import { Redirect, useParams } from "wouter";

import { useTeacher, useTeacherStudents } from "~/web/teacher/provider";

import { StudentProvider } from "./provider";

export function ImpersonificationAuth({ children }: { children: ReactNode }) {
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
          participation={participation}
          student={student}
          setStudent={async () => {}}
          reset={async () => {}}
          terminated={true}>
          {children}
        </StudentProvider>
      </div>
    </div>
  );
}
