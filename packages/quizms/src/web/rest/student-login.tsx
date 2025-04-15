import { type ReactNode, useCallback, useEffect, useState } from "react";
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
  useGetScore,
  useGetStatus,
  useRest,
} from "./common/api";

type LoginProps = {
  apiUrl: string;
  children: ReactNode;
  redirectUrl?: string;
};

export function RestStudentLogin({ children, apiUrl, redirectUrl }: LoginProps) {
  const url = new URL(apiUrl, window.origin);
  return (
    <CookiesProvider>
      <RestContext.Provider value={{ apiUrl: url.toString(), redirectUrl }}>
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
    },
    [setCookie],
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
  const [localStudent, setLocalStudent] = useState(fetchedStudent);
  const [, , removeCookie] = useCookies(["token"]);
  useEffect(() => {
    setLocalStudent(fetchedStudent);
  }, [fetchedStudent]);
  const { contest, isLoading: isContestLoading } = useGetContest();
  const { score, isLoading: isScoreLoading } = useGetScore();
  const { participation, isLoading: isParticipationLoading } = useGetParticipation();

  const { apiUrl } = useRest()!;

  const logoutCallback = useCallback(() => {
    removeCookie("token");
  }, [removeCookie]);

  const setStudentCallback = useCallback(
    (newStudent: Student) => {
      let answersUpdated = false;
      let codeUpdated = false;
      for (const problemId in newStudent.answers) {
        if (
          !localStudent.answers ||
          newStudent.answers[problemId] !== localStudent.answers[problemId]
        ) {
          answersUpdated = true;
          break;
        }
      }
      for (const problemId in newStudent.code) {
        if (!localStudent.code || newStudent.code[problemId] !== localStudent.code[problemId]) {
          codeUpdated = true;
          break;
        }
      }
      if (answersUpdated || codeUpdated) {
        setAnswers(apiUrl, {
          code: newStudent.code,
          answers: answersUpdated ? newStudent.answers : undefined,
        })
          .then((res) => {
            if (res.status !== 200) {
              throw new Error("Failed to update answers");
            }
          })
          .catch(() => mutate());
      }
      setLocalStudent({
        ...localStudent,
        answers: newStudent.answers,
        code: newStudent.code,
      });
    },
    [apiUrl, localStudent, mutate],
  );

  if (isContestLoading || isParticipationLoading) {
    return <Loading />;
  }

  return (
    <StudentProvider
      student={localStudent}
      setStudent={setStudentCallback}
      contest={contest}
      participation={participation}
      score={{ isLoading: isScoreLoading, score }}
      logout={logoutCallback}>
      {children}
    </StudentProvider>
  );
}
