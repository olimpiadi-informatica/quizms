import { useCallback, useEffect, useMemo } from "react";

import { StudentFormField, Title } from "@olinfo/quizms/components";
import type { Contest, Student } from "@olinfo/quizms/models";
import { StudentProvider } from "@olinfo/quizms/student";
import {
  Form,
  Navbar,
  NavbarBrand,
  SelectField,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { waitForPendingWrites } from "firebase/firestore";
import { isEqual } from "lodash-es";

import { studentLogin } from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import {
  contestConverter,
  participationConverter,
  studentConverter,
} from "~/web/common/converters";
import { useWebsite } from "~/web/common/website";
import { useAuth, useCollection, useDocument } from "~/web/hooks";

import { StudentRestoring } from "./student-restoring";
import { FirebaseStatement } from "./student-statement";
// @ts-expect-error
import Header from "virtual:quizms-firebase-header";

export default function StudentEntry() {
  const auth = useAuth("student");

  const website = useWebsite();
  const [contests] = useCollection("contests", contestConverter, {
    constraints: { id: website.contests },
    subscribe: true,
  });

  if (auth) {
    return (
      <StudentRestoring user={auth.user}>
        <StudentInner
          contests={contests}
          participationId={auth.claims.participationId}
          studentId={auth.claims.studentId}
        />
      </StudentRestoring>
    );
  }

  return <StudentForm contests={contests} />;
}

type FormStudent = {
  contestId: string;
  token: string;
} & Student["userData"];

function StudentForm({ contests }: { contests: Contest[] }) {
  const db = useDb();

  const submit = useCallback(
    async ({ contestId, token, ...userData }: FormStudent) => {
      const data = await studentLogin(db, {
        contestId,
        token,
        userData: {
          ...userData,
          birthDate: userData.birthDate ? new Date(userData.birthDate) : undefined,
        },
        extraData: {
          userAgent: navigator.userAgent,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          screenWidth: window.screen.availWidth,
          screenHeight: window.screen.availHeight,
          pixelRatio: window.devicePixelRatio,
          darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
        },
      });

      const auth = getAuth(db.app);
      await signInWithCustomToken(auth, data.token);
    },
    [db],
  );

  const defaultValue = useMemo(
    () => ({
      contestId: contests.length === 1 ? contests[0] : undefined,
    }),
    [contests],
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
      <Form defaultValue={defaultValue} onSubmit={submit} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gara</h1>
        <SelectField
          field="contestId"
          label="Gara"
          options={Object.fromEntries(contests.map((c) => [c.id, c.name]))}
          placeholder="Seleziona una gara"
        />
        {({ contestId }) => {
          const contest = contests.find((c) => c.id === contestId);
          if (!contest) return;
          return (
            <>
              {contest.userData.map((field) => (
                <StudentFormField key={field.name} field={field} />
              ))}
              <TextField field="token" label="Codice prova" placeholder="aaaaa-bbbbb-ccccc" />
              <SubmitButton>Inizia la prova</SubmitButton>
            </>
          );
        }}
      </Form>
    </>
  );
}

function StudentInner({
  contests,
  participationId,
  studentId,
}: {
  contests: Contest[];
  participationId: string;
  studentId: string;
}) {
  const db = useDb();

  const [student, setStudent] = useDocument(
    `participations/${participationId}/students`,
    studentId,
    studentConverter,
    { subscribe: true },
  );
  const [participation] = useDocument("participations", participationId, participationConverter, {
    subscribe: true,
  });

  const contest = useMemo(
    () => contests.find((c) => c.id === student.contestId)!,
    [contests, student.contestId],
  );

  const onSubmit = useCallback(async () => {
    await waitForPendingWrites(db);
  }, [db]);

  const logout = useCallback(async () => {
    await waitForPendingWrites(db);
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  useEffect(() => {
    if (participation.token !== student.token) {
      void logout();
    }
  }, [participation.token, student.token, logout]);

  const setStudentAndSubmission = async (newStudent: Student) => {
    if (!isEqual(student, newStudent)) {
      await setStudent({ ...newStudent });
    }
  };

  return (
    <StudentProvider
      contest={contest}
      participation={participation}
      student={student}
      setStudent={setStudentAndSubmission}
      logout={logout}
      onSubmit={onSubmit}>
      <Header contestId={contest.id} />
      <FirebaseStatement />
    </StudentProvider>
  );
}
