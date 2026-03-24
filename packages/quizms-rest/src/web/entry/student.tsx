import { useCallback } from "react";

import { Title } from "@olinfo/quizms/components";
import { contestSchema, studentSchema, venueSchema, type Answer } from "@olinfo/quizms/models";
import { RemoteStatement, StudentProvider } from "@olinfo/quizms/student";
import { useUserAgent, validate } from "@olinfo/quizms/utils";
import { Form, Navbar, NavbarBrand, TextField } from "@olinfo/react-components";
import { useCookies } from "react-cookie";
import useSWR from "swr";

import type { Contest as ContestResponse } from "../hooks/bindings/Contest";
import type { Student as StudentResponse } from "../hooks/bindings/Student";
import type { Venue as VenueResponse } from "../hooks/bindings/Venue";
import { restToContest, restToStudent, restToVenue } from "../hooks/converters";
import { parse } from "zod";

export default function StudentEntry() {
  const [{ token }] = useCookies(["token"], {
    doNotParse: true,
  });

  if (token) {
    return <StudentInner />;
  }

  return <StudentForm />;
}

function StudentForm() {
  const ua = useUserAgent();
  const [_cookies, setCookie, _removeCookie] = useCookies(["token"], {
    doNotParse: true,
  });
  const submit = useCallback(
    async ({ token }: { token: string }) => {
      setCookie("token", token);
      if (ua.hasFullscreen) {
        await document.documentElement.requestFullscreen?.();
      }
    },
    [setCookie, ua],
  );
  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
      </Navbar>
      <Form onSubmit={submit} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gara</h1>
        <TextField field="token" label="Codice di accesso" placeholder="aaaaa-bbbbb-ccccc" />
      </Form>
    </>
  );
}

function StudentInner() {
  const [{ token }, _setCookie, removeCookie] = useCookies(["token"]);
  const {
    data: restStudent,
    error: studentError,
    isLoading: isStudentLoading,
  } = useSWR(["/api/contestant/status", token], ([url, _token]) =>
    fetch(url).then((d) => d.json()).then((j) => validate(studentSchema, {...j, score: null})),
  );
  const {
    data: contest,
    error: contestError,
    isLoading: isContestLoading,
  } = useSWR(["/api/contestant/contest", token], ([url, _token]) =>
    fetch(url).then((d) => d.json()).then((j) => validate(contestSchema, j)),
  );
  const {
    data: venue,
    error: venueError,
    isLoading: isVenueLoading,
  } = useSWR(["/api/contestant/venue", token], ([url, _token]) =>
    fetch(url).then((d) => d.json()).then((j) => validate(venueSchema, j)),
  );

  const logout = useCallback(() => {
    removeCookie("token");
  }, [removeCookie]);

  if (studentError || contestError || venueError) {
    return <> ERROR </>;
  }
  if (isStudentLoading || isContestLoading || isVenueLoading) {
    return <> LOADING </>;
  }

  const student = restToStudent(restStudent!);

  return (
    <StudentProvider
      contest={contest}
      venue={venue}
      student={student}
      setAnswer={async (problemId: string, answer: Answer) => {
        const answers = student.answers!;
        answers[problemId] = answer;
        await fetch("/api/contestant/set_answers", {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(answers),
        });
      }}
      logout={logout}
      submit={() => {}}
      enforceFullscreen={true}>
      {JSON.stringify(student, undefined, 2)}
      {JSON.stringify(contest, undefined, 2)}
      {JSON.stringify(venue, undefined, 2)}
    </StudentProvider>
  );
}
