import { useCallback } from "react";

import { Title } from "@olinfo/quizms/components";
import { type Answer, contestSchema, studentSchema, venueSchema } from "@olinfo/quizms/models";
import { RemoteStatement, StudentProvider, useStudent } from "@olinfo/quizms/student";
import { useUserAgent, validate } from "@olinfo/quizms/utils";
import {
  Button,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { useCookies } from "react-cookie";
import useSWR, { mutate, type SWRConfiguration } from "swr";

// @ts-expect-error
import Header from "virtual:quizms-rest-header";

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
        <SubmitButton>Inizia la prova</SubmitButton>
      </Form>
    </>
  );
}

function StudentInner() {
  const [{ token }, _setCookie, removeCookie] = useCookies(["token"]);

  const swrConfig: SWRConfiguration = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    suspense: true,
  };

  const { data: student, mutate: mutateStudent } = useSWR(
    `contestant/status/${token}`,
    () =>
      fetch("/api/contestant/status")
        .then((d) => d.json())
        .then((j) => validate(studentSchema, { ...j, score: null })),
    swrConfig,
  );
  const { data: contest } = useSWR(
    `/contestant/contest/${token}`,
    () =>
      fetch("/api/contestant/contest")
        .then((d) => d.json())
        .then((j) => validate(contestSchema, j)),
    swrConfig,
  );
  const { data: venue } = useSWR(
    `/api/contestant/venue/${token}`,
    () =>
      fetch("/api/contestant/venue")
        .then((d) => d.json())
        .then((j) => validate(venueSchema, j)),
    swrConfig,
  );

  const logout = useCallback(() => {
    removeCookie("token");
  }, [removeCookie]);

  const submit = useCallback(async () => {
    await fetch("/api/contestant/end", { method: "post" });
    await mutate(`contestant/status/${token}`);
  }, [token]);

  const setAnswer = useCallback(
    async (problemId: string, answer: Answer) => {
      const answers = {
        ...student!.answers,
        [problemId]: answer,
      };
      await fetch("/api/contestant/set_answers", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      });
      await mutateStudent({ ...student!, answers });
    },
    [mutateStudent, student],
  );

  if (!student || !contest || !venue) {
    return <> ERROR </>;
  }

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
      <RestStatement />
    </StudentProvider>
  );
}

function RestStatement() {
  const { student } = useStudent();
  const [{ token }] = useCookies(["token"], {
    doNotParse: true,
  });

  const start = async () => {
    await fetch("/api/contestant/start", { method: "post" });
    await mutate(`contestant/status/${token}`);
  };

  const getFileUrl = (fileName: string) => {
    return `/api/contestant/file/${fileName}`;
  };

  if (!student.participationWindow) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <Button className="btn-success btn-lg" onClick={start}>
          Inizia
        </Button>
      </div>
    );
  }
  return (
    <RemoteStatement statementUrl={() => getFileUrl("statement.txt")} moduleUrl={getFileUrl} />
  );
}
