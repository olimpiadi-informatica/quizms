import { useCallback, useEffect, useMemo } from "react";

import {
  StudentFormField,
  Title,
  UiLanguageScope,
  UiLanguageSelect,
} from "@olinfo/quizms/components";
import type { Answer, Contest, Student } from "@olinfo/quizms/models";
import { StudentProvider, useStatementLanguageState } from "@olinfo/quizms/student";
import { contestsLanguages, useUserAgent } from "@olinfo/quizms/utils";
import {
  Form,
  Navbar,
  NavbarBrand,
  NavbarContent,
  SelectField,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { waitForPendingWrites } from "firebase/firestore";

import { setStudentLanguage, studentLogin } from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import { contestConverter, studentConverter, venueConverter } from "~/web/common/converters";
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
  });

  if (auth) {
    return (
      <StudentRestoring user={auth.user}>
        <StudentInner
          user={auth.user}
          contests={contests}
          venueId={auth.claims.venueId}
          studentId={auth.claims.studentId}
        />
      </StudentRestoring>
    );
  }

  return <StudentLogin contests={contests} />;
}

/** The login form is in the languages of the contests of this website. */
function StudentLogin({ contests }: { contests: Contest[] }) {
  const languages = useMemo(() => contestsLanguages(contests), [contests]);
  return (
    <UiLanguageScope languages={languages}>
      <StudentForm contests={contests} />
    </UiLanguageScope>
  );
}

type FormStudent = {
  contestId: string;
  token: string;
} & Required<NonNullable<Student["userData"]>>;

function StudentForm({ contests }: { contests: Contest[] }) {
  const db = useDb();
  const ua = useUserAgent();

  const submit = useCallback(
    async ({ contestId, token, ...userData }: FormStudent) => {
      const authToken = await studentLogin({
        contestId,
        token,
        userData,
        extraData: {
          userAgent: ua,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          screenWidth: window.screen.availWidth,
          screenHeight: window.screen.availHeight,
          pixelRatio: window.devicePixelRatio,
          darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
        },
      });

      const auth = getAuth(db.app);
      await signInWithCustomToken(auth, authToken);
      if (ua.hasFullscreen) {
        await document.documentElement.requestFullscreen?.();
      }
    },
    [db, ua],
  );

  const defaultValue = useMemo(
    () => ({
      contestId: contests.length === 1 ? contests[0].id : undefined,
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
        <NavbarContent>
          <UiLanguageSelect />
        </NavbarContent>
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
  user,
  contests,
  venueId,
  studentId,
}: {
  user: User;
  contests: Contest[];
  venueId: string;
  studentId: string;
}) {
  const db = useDb();

  const [student, setStudent] = useDocument(
    `venues/${venueId}/students`,
    studentId,
    studentConverter,
  );
  const [venue] = useDocument("venues", venueId, venueConverter);

  const contest = useMemo(
    () => contests.find((c) => c.id === student.contestId)!,
    [contests, student.contestId],
  );

  const submit = useCallback(async () => {
    await setStudent({
      ...student,
      participationWindow: { start: student.participationWindow!.start, end: new Date() },
    });
    await waitForPendingWrites(db);
  }, [db, student, setStudent]);

  const logout = useCallback(async () => {
    await waitForPendingWrites(db);
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  useEffect(() => {
    if (venue.token !== student.token) {
      void logout();
    }
  }, [venue.token, student.token, logout]);

  const setAnswer = async (problemId: string, answer: Answer) => {
    await setStudent({
      ...student,
      answers: { ...student.answers, [problemId]: answer },
    });
  };

  // Students can switch language at any time during the contest; the choice is saved on the
  // student (through the API) so that it survives reloads and device changes. It is read back
  // from the student document above.
  const saveLanguage = useCallback(
    (language: string) => setStudentLanguage(user, language),
    [user],
  );
  const [language, setLanguage] = useStatementLanguageState(
    contest,
    student.language,
    saveLanguage,
  );

  return (
    <StudentProvider
      contest={contest}
      venue={venue}
      student={student}
      language={language}
      setLanguage={setLanguage}
      setAnswer={setAnswer}
      logout={logout}
      submit={submit}
      enforceFullscreen={true}>
      <Header contestId={contest.id} />
      <FirebaseStatement />
    </StudentProvider>
  );
}
