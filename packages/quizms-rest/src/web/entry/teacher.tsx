import { useCallback, useEffect } from "react";

import { Title } from "@olinfo/quizms/components";
import type { Student, StudentRestore } from "@olinfo/quizms/models";
import { RemoteStatement, useStudent } from "@olinfo/quizms/student";
import { TeacherProvider } from "@olinfo/quizms/teacher";
import {
  CurrentPasswordField,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
import { HTTPError } from "ky";
import { useCookies } from "react-cookie";
import { useSearch } from "wouter";

import api from "../common/api";
import {
  useRestAnnouncements,
  useRestContests,
  useRestStudentRestores,
  useRestStudents,
  useRestVariants,
  useRestVenues,
} from "../hooks";

export default function TeacherEntry() {
  const [{ token }] = useCookies(["token"], { doNotParse: true });

  if (token) {
    return <TeacherInner />;
  }

  return <TeacherLogin />;
}

function TeacherLogin() {
  const [, , , updateCookies] = useCookies(["token"], { doNotParse: true });

  const params = new URLSearchParams(useSearch());

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("username");
    url.searchParams.delete("password");
    window.history.replaceState(undefined, "", url.href);
  }, []);

  const defaultCredential = {
    username: params.get("username") ?? "",
    password: params.get("password") ?? "",
  };

  const signIn = async (credential: { username: string; password: string }) => {
    try {
      await api.post("teacher/login", { json: credential });
    } catch (error) {
      console.log("error");
      if (error instanceof HTTPError) {
        const { status } = error.response;
        console.log(status);

        if (status === 403) {
          throw new Error("Credenziali non valide", { cause: error });
        }
      }
      throw error;
    }
    updateCookies();
  };

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
      </Navbar>
      <Form defaultValue={defaultCredential} onSubmit={signIn} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gestione gara</h1>
        <UsernameField field="username" />
        <CurrentPasswordField field="password" />
        <SubmitButton>Accedi</SubmitButton>
      </Form>
    </>
  );
}

function useStudents(venueId: string): [Student[], (s: Student) => Promise<void>] {
  return [useRestStudents(venueId).data!, async () => {}];
}

function useAnnouncements(contestId: string) {
  return useRestAnnouncements(contestId).data!;
}

function TeacherStatement() {
  const { student } = useStudent();
  const getFileUrl = useCallback(
    (fileName: string) => {
      return `${process.env.BASE_PATH}/api/teacher/file/${student.venueId}/${student.id}/${fileName}`;
    },
    [student.venueId, student.id],
  );
  return (
    <RemoteStatement statementUrl={() => getFileUrl("statement.txt")} moduleUrl={getFileUrl} />
  );
}

function TeacherInner() {
  const { data: contests } = useRestContests();
  const { data: venues, mutate: mutateVenues } = useRestVenues();
  const { data: variants } = useRestVariants();

  const [, , removeCookie] = useCookies(["token"], { doNotParse: true });

  const start = useCallback(
    async (venueId: string) => {
      await api.post(`teacher/start/${venueId}`);
      await mutateVenues();
    },
    [mutateVenues],
  );

  const finalize = async (venueId: string) => {
    await api.post(`teacher/finalize/${venueId}`);
    await mutateVenues();
  };

  const logout = useCallback(() => {
    removeCookie("token", { path: "/" });
  }, [removeCookie]);

  return (
    <TeacherProvider
      name={venues[0]?.name}
      venues={venues}
      contests={contests}
      startContestWindow={start}
      stopContestWindow={async () => {}}
      finalizeVenue={finalize}
      variants={variants}
      logout={logout}
      statementComponent={() => <TeacherStatement />}
      getPdfStatements={async () => ({})}
      useAnnouncements={useAnnouncements}
      useStudents={useStudents}
      useStudentRestores={useStudentRestores}
    />
  );
}

function useStudentRestores(
  venueId: string,
): readonly [
  StudentRestore[],
  (request: StudentRestore) => Promise<void>,
  (studentId: string) => Promise<void>,
] {
  const { data: studentRestores, mutate: mutateStudentRestores } = useRestStudentRestores(venueId);

  const reject = async (studentId: string) => {
    const resp = api.post(`teacher/revoke-restores/${venueId}/${studentId}`).then(() => undefined);
    await mutateStudentRestores(resp, {
      optimisticData: studentRestores.filter((s) => s.studentId !== studentId),
      populateCache: false,
    });
  };

  const approve = async (request: StudentRestore) => {
    const resp = api.post(`teacher/approve-restore/${venueId}/${request.id}`).then(() => undefined);
    await mutateStudentRestores(resp, {
      optimisticData: studentRestores.filter((s) => s.studentId !== request.studentId),
      populateCache: false,
    });
  };

  return [studentRestores, approve, reject];
}
