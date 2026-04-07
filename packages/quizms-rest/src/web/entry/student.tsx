import { useCallback } from "react";

import { Title } from "@olinfo/quizms/components";
import type { Answer } from "@olinfo/quizms/models";
import { RemoteStatement, StudentProvider, useStudent } from "@olinfo/quizms/student";
import { useUserAgent } from "@olinfo/quizms/utils";
import {
  Button,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { HTTPError } from "ky";
import { useCookies } from "react-cookie";
import { mutate } from "swr";

import api from "../common/api";
import { useRestContest, useRestStudent, useRestVenue } from "../hooks";
import { StudentRestoring } from "./student-restoring";
// @ts-expect-error
import Header from "virtual:quizms-rest-header";

export default function StudentEntry() {
  const [{ token }] = useCookies(["token"], { doNotParse: true });

  if (token) {
    return (
      <StudentRestoring>
        <StudentInner />
      </StudentRestoring>
    );
  }

  return <StudentForm />;
}

function StudentForm() {
  const [, , , updateCookies] = useCookies(["token"], { doNotParse: true });

  const submit = useCallback(
    async ({ token }: { token: string }) => {
      try {
        await api.post("contestant/login", { json: token });
      } catch (error) {
        if (error instanceof HTTPError) {
          const { status } = error.response;

          if (status === 403) {
            throw new Error("Token non valido", { cause: error });
          }
        }
        throw error;
      }
      updateCookies();
    },
    [updateCookies],
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
        <SubmitButton>Inizia la prova</SubmitButton>
      </Form>
    </>
  );
}

function StudentInner() {
  const [, , removeCookie] = useCookies(["token"], { doNotParse: true });

  const { data: student, mutate: mutateStudent } = useRestStudent();
  const { data: contest } = useRestContest();
  const { data: venue } = useRestVenue();

  const logout = useCallback(async () => {
    removeCookie("token", { path: "/" });
    await mutate(() => true, undefined, { revalidate: false });
  }, [removeCookie]);

  const submit = useCallback(async () => {
    const resp = api.post("contestant/end").then(() => undefined);
    await mutateStudent(resp, {
      optimisticData: {
        ...student,
        participationWindow: student.participationWindow && {
          start: student.participationWindow.start,
          end: new Date(),
        },
      },
      populateCache: false,
    });
  }, [mutateStudent, student]);

  const setAnswer = useCallback(
    async (problemId: string, answer: Answer) => {
      const answers = {
        ...student.answers,
        [problemId]: answer,
      };
      const resp = api.post("contestant/set_answers", { json: answers }).then(() => undefined);
      await mutateStudent(resp, { optimisticData: { ...student, answers }, populateCache: false });
    },
    [mutateStudent, student],
  );
  return (
    <StudentProvider
      contest={contest}
      venue={venue}
      student={student}
      setAnswer={setAnswer}
      logout={logout}
      submit={submit}
      enforceFullscreen={true}>
      <Header contestId={contest.id} />
      <StudentStatement />
    </StudentProvider>
  );
}

function StudentStatement() {
  const { student, venue } = useStudent();
  const { mutate: mutateStudent } = useRestStudent();
  const ua = useUserAgent();

  const start = useCallback(async () => {
    await api.post("contestant/start");
    await mutateStudent();
    if (ua.hasFullscreen) {
      await document.documentElement.requestFullscreen?.();
    }
  }, [mutateStudent, ua.hasFullscreen]);

  const getFileUrl = (fileName: string) => {
    return `${process.env.BASE_PATH}api/contestant/file/${fileName}`;
  };

  if (!student.participationWindow) {
    const now = new Date();
    const canStart =
      venue.participationWindow &&
      venue.participationWindow.start <= now &&
      venue.participationWindow.end;
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <Button className="btn-success btn-lg" onClick={start} disabled={!canStart}>
          Inizia
        </Button>
      </div>
    );
  }
  return (
    <RemoteStatement statementUrl={() => getFileUrl("statement.txt")} moduleUrl={getFileUrl} />
  );
}
