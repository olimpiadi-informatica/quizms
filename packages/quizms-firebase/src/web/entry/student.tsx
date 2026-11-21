import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import {
  StudentFormField,
  Title,
  UiLanguageScope,
  UiLanguageSelect,
  useLocalize,
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

import { AnswerQueue, type AnswerQueueStatus } from "~/web/common/answer-queue";
import {
  setStudentLanguage,
  studentLogin,
  studentSetAnswer,
  studentSubmitContest,
} from "~/web/common/api";
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

  // The login form and the restore screen are in the languages of the contests of this website;
  // the contest itself is in the statement language (see `StudentProvider`).
  const languages = useMemo(() => contestsLanguages(contests), [contests]);

  return (
    <UiLanguageScope languages={languages}>
      {auth ? (
        <StudentRestoring user={auth.user}>
          <StudentInner
            user={auth.user}
            contests={contests}
            venueId={auth.claims.venueId}
            studentId={auth.claims.studentId}
          />
        </StudentRestoring>
      ) : (
        <StudentForm contests={contests} />
      )}
    </UiLanguageScope>
  );
}

type FormStudent = {
  contestId: string;
  token: string;
} & Required<NonNullable<Student["userData"]>>;

function StudentForm({ contests }: { contests: Contest[] }) {
  const { t } = useLingui();
  const localize = useLocalize();
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
        <h1 className="mb-2 text-xl font-bold">
          <Trans>Log in to the contest</Trans>
        </h1>
        <SelectField
          field="contestId"
          label={t`Contest`}
          options={Object.fromEntries(contests.map((c) => [c.id, localize(c.name)]))}
          placeholder={t`Select a contest`}
        />
        {({ contestId }) => {
          const contest = contests.find((c) => c.id === contestId);
          if (!contest) return;
          return (
            <>
              {contest.userData.map((field) => (
                <StudentFormField key={field.name} field={field} />
              ))}
              <TextField field="token" label={t`Test code`} placeholder="aaaaa-bbbbb-ccccc" />
              <SubmitButton>
                <Trans>Start the test</Trans>
              </SubmitButton>
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

  const [serverStudent] = useDocument(`venues/${venueId}/students`, studentId, studentConverter);
  const [venue] = useDocument("venues", venueId, venueConverter);

  // Answers are saved through the API one at a time, retried while offline, and shown
  // immediately on top of the server data.
  const answerQueue = useMemo(
    () => new AnswerQueue((problemId, answer) => studentSetAnswer(user, { problemId, answer })),
    [user],
  );
  const queueVersion = useSyncExternalStore(answerQueue.subscribe, answerQueue.getVersion);
  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the queue changes
  const student = useMemo(
    () => ({ ...serverStudent, answers: answerQueue.merge(serverStudent.answers) }),
    [serverStudent, answerQueue, queueVersion],
  );

  const contest = useMemo(
    () => contests.find((c) => c.id === student.contestId)!,
    [contests, student.contestId],
  );

  const submit = useCallback(async () => {
    await answerQueue.flush(20_000);
    await studentSubmitContest(user);
  }, [answerQueue, user]);

  const logout = useCallback(async () => {
    // Give pending answers a chance to be saved, but never block the logout.
    await answerQueue.flush(5000).catch(() => {});
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [answerQueue, db]);

  useEffect(() => {
    if (venue.token !== student.token) {
      void logout();
    }
  }, [venue.token, student.token, logout]);

  const setAnswer = useCallback(
    (problemId: string, answer: Answer) => answerQueue.set(problemId, answer),
    [answerQueue],
  );

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
      <SaveStatus status={answerQueue.status} />
    </StudentProvider>
  );
}

function SaveStatus({ status }: { status: AnswerQueueStatus }) {
  if (status.error) {
    return (
      <div role="alert" className="alert alert-error fixed inset-x-4 bottom-4 z-50 w-auto">
        Risposta non salvata: {status.error}
      </div>
    );
  }
  if (status.failing) {
    return (
      <div role="alert" className="alert alert-warning fixed inset-x-4 bottom-4 z-50 w-auto">
        Connessione assente: le risposte non sono ancora state salvate, nuovo tentativo in corso...
      </div>
    );
  }
  return null;
}
