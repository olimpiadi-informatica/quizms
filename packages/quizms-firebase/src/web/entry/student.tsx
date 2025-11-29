import { type ReactNode, useCallback, useEffect, useMemo } from "react";

import { Loading, StudentFormField, useMetadata } from "@olinfo/quizms/components";
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
  studentRestoreConvert,
} from "~/web/common/converters";
import { useAuth, useCollection, useDocument, useDocumentOptional } from "~/web/hooks";

import { FirebaseStatement } from "./student-statement";

export default function StudentEntry() {
  const auth = useAuth("student");

  const [contests] = useCollection("contests", contestConverter, {
    subscribe: true,
  });

  const filteredContests = useMemo(
    () =>
      contests.filter(
        (contest) =>
          window.location.hostname === "localhost" ||
          !contest.allowedOrigins ||
          contest.allowedOrigins.includes(window.location.host),
      ),
    [contests],
  );

  if (auth) {
    return (
      <StudentRestoring uid={auth.user.uid}>
        <StudentInner
          contests={filteredContests}
          participationId={auth.claims.participationId}
          studentId={auth.claims.studentId}
        />
      </StudentRestoring>
    );
  }

  return <StudentForm contests={filteredContests} />;
}

type FormStudent = {
  contestId: string;
  token: string;
} & Student["userData"];

function StudentForm({ contests }: { contests: Contest[] }) {
  const db = useDb();
  const metadata = useMetadata();

  const submit = useCallback(
    async ({ contestId, token, ...userData }: FormStudent) => {
      const data = await studentLogin(db, {
        contestId,
        token,
        userData: {
          ...userData,
          birthDate: userData.birthDate ? new Date(userData.birthDate) : undefined,
        },
      });

      const auth = getAuth(db.app);
      await signInWithCustomToken(auth, data.token);
    },
    [db],
  );

  const defaultValue = useMemo(
    () => ({
      contestId: Object.keys(contests).length === 1 ? Object.keys(contests)[0] : undefined,
    }),
    [contests],
  );

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">{metadata.title}</div>
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

function StudentRestoring({ uid, children }: { uid: string; children: ReactNode }) {
  const db = useDb();

  const [studentRestore] = useDocumentOptional("studentRestore", uid, studentRestoreConvert, {
    subscribe: true,
  });

  useEffect(() => {
    if (studentRestore?.status === "revoked") {
      void signOut(getAuth(db.app)).then(() => window.location.reload());
    }
  }, [db, studentRestore]);

  if (!studentRestore || studentRestore.status === "approved") {
    return children;
  }

  if (studentRestore.status === "revoked") {
    return <Loading />;
  }

  return (
    <div className="flex flex-col justify-center items-center grow text-center m-4">
      <p>
        Il tuo account è già presente su un&apos;altro dispositivo. Per trasferire l&apos;accesso al
        dispositivo corrente comunica al tuo insegnante il codice seguente:
      </p>
      <div className="flex justify-center pt-3">
        <span className="pt-1 font-mono text-3xl">
          {String(studentRestore?.approvalCode).padStart(3, "0")}
        </span>
      </div>
    </div>
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

  const contest = contests.find((c) => c.id === student.contestId)!;

  const onSubmit = async () => {
    await waitForPendingWrites(db);
  };

  const logout = async () => {
    await waitForPendingWrites(db);
    await signOut(getAuth(db.app));
    window.location.reload();
  };

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
      reset={logout}
      onSubmit={onSubmit}>
      <FirebaseStatement />
    </StudentProvider>
  );
}
