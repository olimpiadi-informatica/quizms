import { useCallback, useEffect } from "react";

import { Title } from "@olinfo/quizms/components";
import type { Student } from "@olinfo/quizms/models";
import { TeacherProvider } from "@olinfo/quizms/teacher";
import {
  CurrentPasswordField,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
import { useCookies } from "react-cookie";
import { useSearch } from "wouter";

import { useRestContests, useRestStudents, useRestVariants, useRestVenues } from "../hooks";

export default function TeacherEntry() {
  const [{ username, password }] = useCookies(["username", "password"], {
    doNotParse: true,
  });
  if (username && password) {
    return <TeacherInner />;
  }

  return <TeacherLogin />;
}

function TeacherLogin() {
  const [_cookies, setCookie, _removeCookie] = useCookies(["username", "password"], {
    doNotParse: true,
  });
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

  const signIn = ({ username, password }: { username: string; password: string }) => {
    setCookie("username", username, { path: "/" });
    setCookie("password", password, { path: "/" });
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

function TeacherInner() {
  const { data: contests } = useRestContests();
  const { data: venues, mutate: mutateVenues } = useRestVenues();
  const { data: variants } = useRestVariants();

  const start = useCallback(
    async (venueId: string) => {
      await fetch(`/api/teacher/start/${venueId}`, { method: "post" });
      await mutateVenues();
    },
    [mutateVenues],
  );

  if (!contests || !venues || !variants) {
    return;
  }

  return (
    <TeacherProvider
      name={venues[0]?.name}
      venues={venues}
      contests={contests}
      startContestWindow={start}
      stopContestWindow={async () => {}}
      finalizeVenue={async () => {}}
      variants={variants}
      logout={async () => {}}
      statementComponent={() => <></>}
      getPdfStatements={async () => ({})}
      useAnnouncements={() => []}
      useStudents={useStudents}
      useStudentRestores={() => [[], async () => {}, async () => {}]}
    />
  );
}
