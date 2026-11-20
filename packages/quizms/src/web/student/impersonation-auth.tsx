import type { ReactNode } from "react";

import { Redirect, useParams } from "wouter";

import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { useStatementLanguageState } from "./language";
import { StudentProvider } from "./provider";

export function ImpersonationAuth({ children }: { children: ReactNode }) {
  const { contest, venue } = useTeacher();
  const [students] = useTeacherStudents();

  const { studentId } = useParams();
  const student = students.find((s) => s.id === studentId);

  // Opens in the student's language; the teacher can switch without saving it.
  const [language, setLanguage] = useStatementLanguageState(contest, student?.language);

  if (!student) {
    return <Redirect to="/student" />;
  }

  const fakeRange = { start: new Date(0), end: new Date(0) };

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-base-100">
      <div className="">
        <StudentProvider
          contest={contest}
          language={language}
          setLanguage={setLanguage}
          venue={{ ...venue, participationWindow: fakeRange }}
          student={{ ...student, participationWindow: fakeRange }}
          setAnswer={() => {}}
          submit={() => {}}
          enforceFullscreen={false}>
          {children}
        </StudentProvider>
      </div>
    </div>
  );
}
