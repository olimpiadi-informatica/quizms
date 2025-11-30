import { type ReactNode, useRef } from "react";

import {
  Form,
  Modal,
  Navbar,
  NavbarBrand,
  SelectField,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import type { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { addDoc, collection, waitForPendingWrites } from "firebase/firestore";
import { isEqual, mapValues } from "lodash-es";

import type { Contest, Student } from "~/models";
import { hash } from "~/utils/hash";
import getTitle from "~/utils/title";
import { StudentProvider } from "~/web/student/provider";
import { UserDataField } from "~/web/student/user-data-form";

import { FirebaseLogin, useDb } from "./common/base-login";
import {
  contestConverter,
  participationConverter,
  studentConverter,
  studentMappingUidConverter,
  submissionConverter,
} from "./common/converters";
import { useAnonymousAuth, useCollection, useDocument, useDocumentOptional } from "./hooks";
import { DuplicateStudentError, loginAction } from "./student-login-action";

type LoginProps = {
  config: FirebaseOptions;
  contestFilter?: string[];
  children: ReactNode;
};

export function FirebaseStudentLogin({ config, contestFilter, children }: LoginProps) {
  return (
    <FirebaseLogin config={config}>
      <StudentLoginInner contestFilter={contestFilter}>{children}</StudentLoginInner>
    </FirebaseLogin>
  );
}

function StudentLoginInner({ contestFilter, children }: Omit<LoginProps, "config">) {
  const db = useDb();
  const user = useAnonymousAuth();

  const [contests] = useCollection("contests", contestConverter, {
    subscribe: true,
  });
  const [studentMapping] = useDocumentOptional(
    "studentMappingUid",
    user.uid,
    studentMappingUidConverter,
    { subscribe: true },
  );

  const filteredContests = Object.fromEntries(
    contests
      .filter((contest) => contestFilter?.includes(contest.id) ?? true)
      .map((contest) => [contest.id, contest]),
  );

  const modalRef = useRef<HTMLDialogElement>(null);

  if (studentMapping) {
    return (
      <StudentInner
        contests={contests}
        participationId={studentMapping.participationId}
        studentId={studentMapping.studentId}>
        {children}
      </StudentInner>
    );
  }

  const defaultValue = {
    contestId:
      Object.keys(filteredContests).length === 1 ? Object.keys(filteredContests)[0] : undefined,
  };

  type FormStudent = {
    contestId: string;
    token: string;
  } & Student["userData"];

  const submit = async ({ contestId, token, ...userData }: FormStudent) => {
    try {
      await loginAction(db, {
        contestId,
        token,
        userData,
        answers: {},
      });
    } catch (err) {
      if (err instanceof DuplicateStudentError) {
        modalRef.current?.showModal();
      } else {
        throw err;
      }
    }
  };

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">{getTitle()}</div>
        </NavbarBrand>
      </Navbar>
      <Form defaultValue={defaultValue} onSubmit={submit} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gara</h1>
        <SelectField
          field="contestId"
          label="Gara"
          options={mapValues(filteredContests, "name")}
          placeholder="Seleziona una gara"
        />
        {({ contestId }) => {
          const contest = filteredContests[contestId ?? ""];
          if (!contest) return;
          return (
            <>
              {contest.userData.map((field) => (
                <UserDataField key={field.name} field={field} />
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
          <span className="pt-1 font-mono text-3xl">
            {String(hash(user.uid) % 1000).padStart(3, "0")}
          </span>
        </div>
      </Modal>
    </>
  );
}

function StudentInner({
  contests,
  participationId,
  studentId,
  children,
}: {
  contests: Contest[];
  participationId: string;
  studentId: string;
  children: ReactNode;
}) {
  const db = useDb();

  const [student, setStudent] = useDocument(
    `participations/${participationId}/students`,
    studentId,
    studentConverter,
  );
  const [participation] = useDocument(
    "participations",
    student.participationId!,
    participationConverter,
    { subscribe: true },
  );

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
    if (isEqual(student, newStudent)) return;

    await setStudent({ ...newStudent });

    const submissionRef = collection(db, "submissions").withConverter(submissionConverter);
    await addDoc(submissionRef, {
      id: "",
      uid: newStudent.uid!,
      student: newStudent,
    });
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
      {children}
    </StudentProvider>
  );
}
