import { ReactNode } from "react";

import { useTeacher, useTeacherStudents } from "~/web/teacher/provider";

import { StudentProvider } from "./provider";

export function ImpersonificationAuth({ id, children }: { id: string; children: ReactNode }) {
  const { contest, participation } = useTeacher();
  const [students] = useTeacherStudents();
  const student = students.find((s) => s.id === id)!;

  return (
    <StudentProvider
      contest={contest}
      participation={participation}
      student={student}
      setStudent={async () => {}}
      reset={async () => {}}
      terminated={true}>
      {children}
    </StudentProvider>
  );
}
