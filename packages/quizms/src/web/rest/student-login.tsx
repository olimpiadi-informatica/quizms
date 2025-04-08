import { type ReactNode, useCallback, useState } from "react";
import { CookiesProvider, useCookies } from "react-cookie";
import type { Student } from "~/models/student";
import { Loading } from "../components";
import { StudentTokenLoginForm } from "../components/student-login-form";
import { StudentProvider } from "../student/provider";
import {
  RestContext,
  setAnswers,
  useGetContest,
  useGetParticipation,
  useGetStatus,
  useRest,
} from "./common/api";

type LoginProps = {
  apiUrl: string;
  children: ReactNode;
};

export function RestStudentLogin({ children, apiUrl }: LoginProps) {
  const url = new URL(apiUrl, window.origin);
  return (
    <CookiesProvider>
      <RestContext.Provider value={{ apiUrl: url.toString() }}>
        <StudentLoginInner>{children}</StudentLoginInner>
      </RestContext.Provider>
    </CookiesProvider>
  );
}

function StudentLoginInner({ children }: { children: ReactNode }) {
  const [Cookies, setCookie] = useCookies(["token"]);

  const { student, isLoading, mutate } = useGetStatus();

  const submit = useCallback(
    ({ token }: { token: string }) => {
      setCookie("token", token);
      mutate();
    },
    [setCookie, mutate],
  );

  if (Cookies.token && !isLoading && student) {
    return (
      <StudentInner fetchedStudent={student} mutate={mutate}>
        {children}
      </StudentInner>
    );
  }

  return <StudentTokenLoginForm onSubmit={submit} />;
}

function StudentInner({
  fetchedStudent,
  mutate,
  children,
}: {
  fetchedStudent: Student;
  mutate: () => void;
  children: ReactNode;
}) {
  const [student, setStudent] = useState(fetchedStudent);
  const { contest, isLoading: isContestLoading } = useGetContest();
  const { participation, isLoading: isParticipationLoading } = useGetParticipation();

  const { apiUrl } = useRest()!;

  const setStudentCallback = useCallback(
    (newStudent: Student) => {
      for (const questionId in newStudent.answers) {
        if (!student.answers || newStudent.answers[questionId] !== student.answers[questionId]) {
          setAnswers(apiUrl, newStudent.answers).catch(mutate);
          break;
        }
      }
      setStudent(newStudent);
    },
    [apiUrl, student, mutate],
  );

  if (isContestLoading || isParticipationLoading) {
    return <Loading />;
  }

  return (
    <StudentProvider
      student={student}
      setStudent={setStudentCallback}
      contest={contest}
      participation={participation}>
      {children}
    </StudentProvider>
  );
}
