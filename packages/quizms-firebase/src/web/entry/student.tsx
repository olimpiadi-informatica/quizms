import { useCallback, useMemo, useRef, useState } from "react";

import { StudentFormField, useMetadata } from "@olinfo/quizms/components";
import type { Contest, Student } from "@olinfo/quizms/models";
import { StudentProvider } from "@olinfo/quizms/student";
import {
  Form,
  Modal,
  Navbar,
  NavbarBrand,
  SelectField,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { waitForPendingWrites } from "firebase/firestore";
import { isEqual, mapValues } from "lodash-es";

import { login } from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import {
  contestConverter,
  participationConverter,
  studentConverter,
} from "~/web/common/converters";
import { useAuth, useCollection, useDocument } from "~/web/hooks";

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

  if (auth && auth.claims.approvalId == null) {
    return (
      <StudentInner
        contests={filteredContests}
        participationId={auth.claims.participationId}
        studentId={auth.claims.studentId}
      />
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

  const modalRef = useRef<HTMLDialogElement>(null);
  const [approvalId, setApprovalId] = useState<number | null>(null);

  const submit = useCallback(
    async (formData: FormStudent) => {
      const data = await login("/api/student/login", formData);

      const auth = getAuth(db.app);
      await signInWithCustomToken(auth, data.token);

      if (data.approvalId != null) {
        setApprovalId(data.approvalId);
        modalRef.current?.showModal();
        return;
      }
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
          options={mapValues(contests, "name")}
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
      <Modal ref={modalRef} title="Attenzione">
        <p>
          Il tuo account è già presente su un&apos;altro dispositivo. Per trasferire l&apos;accesso
          al dispositivo corrente comunica al tuo insegnante il codice seguente:
        </p>
        <div className="flex justify-center pt-3">
          <span className="pt-1 font-mono text-3xl">{String(approvalId).padStart(3, "0")}</span>
        </div>
      </Modal>
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
