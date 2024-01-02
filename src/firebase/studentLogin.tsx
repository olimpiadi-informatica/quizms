import React, { ChangeEvent, ReactNode, forwardRef, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { addMinutes, formatISO } from "date-fns";
import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  Firestore,
  FirestoreError,
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { isDate, isEqual } from "lodash-es";
import { AlertCircle } from "lucide-react";

import { Button } from "~/core/components/button";
import Modal from "~/core/components/modal";
import { useIsAfter, useTime } from "~/core/components/time";
import { StudentProvider } from "~/core/student/provider";
import { FirebaseLogin, useDb } from "~/firebase/baseLogin";
import {
  contestConverter,
  participationConverter,
  participationMappingConverter,
  studentConverter,
  studentMappingHashConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  submissionConverter,
  variantMappingConverter,
} from "~/firebase/converters";
import { useAnonymousAuth, useCollection, useDocument } from "~/firebase/hooks";
import { Contest, Student, parsePersonalInformation, studentHash } from "~/models";
import { hash, randomId } from "~/utils/random";

class DuplicateStudentError extends Error {
  constructor(
    public studentId: string,
    public participationId: string,
  ) {
    super("Studente già registrato");
  }
}

export function StudentLogin({
  config,
  contestFilter,
  children,
}: {
  config: FirebaseOptions;
  contestFilter?: string[];
  children: ReactNode;
}) {
  return (
    <FirebaseLogin config={config}>
      <StudentLoginInner contestFilter={contestFilter}>{children}</StudentLoginInner>
    </FirebaseLogin>
  );
}

function StudentLoginInner({
  contestFilter,
  children,
}: {
  contestFilter?: string[];
  children: ReactNode;
}) {
  const db = useDb();
  const getNow = useTime();

  const user = useAnonymousAuth();
  const [contests] = useCollection("contests", contestConverter);
  const [studentMapping] = useDocument("studentMappingUid", user.uid, studentMappingUidConverter, {
    subscribe: true,
    throwIfMissing: false,
  });

  const filteredContests = contests.filter(
    (contest) => contestFilter?.includes(contest.id) ?? true,
  );

  const [student, setStudent] = useState<Student>({
    id: randomId(),
    uid: user?.uid,
    contestId: filteredContests.length === 1 ? filteredContests[0].id : undefined,
    personalInformation: {},
    answers: {},
    createdAt: getNow(),
    disabled: false,
  });
  const contest = contests.find((c) => c.id === student.contestId);

  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  if (studentMapping) {
    if (loading) {
      setTimeout(() => setLoading(false), 0);
    }
    return (
      <StudentInner
        participationId={studentMapping.participationId}
        studentId={studentMapping.studentId}>
        {children}
      </StudentInner>
    );
  }

  const completed =
    contest?.personalInformation?.every((p) => student.personalInformation?.[p.name]) &&
    !!student.token;

  const start = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await createStudent(db, { ...student });
    } catch (e) {
      if (e instanceof DuplicateStudentError) {
        try {
          await createStudentRestore(db, e.studentId, e.participationId, student);
          modalRef.current?.showModal();
        } catch (e) {
          setError(e as Error);
        }
      } else {
        setError(e as Error);
      }
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      <div className="flex h-full flex-col items-center overflow-y-auto px-4">
        <form className="my-8 w-full max-w-md grow">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg">Gara</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={student.contestId ?? -1}
              onChange={(e) => setStudent((student) => ({ ...student, contestId: e.target.value }))}
              disabled={loading}
              required>
              <option value={-1} disabled>
                Seleziona una gara
              </option>
              {filteredContests.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.name}
                </option>
              ))}
            </select>
          </div>

          {contest?.personalInformation.map((field) => (
            <PersonalInformationField
              key={field.name}
              student={student}
              setStudent={setStudent}
              field={field}
              disabled={loading}
            />
          ))}

          {contest && (
            <>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-lg">Codice</span>
                </label>
                <input
                  type="text"
                  placeholder="Inserisci codice"
                  className="input input-bordered w-full max-w-md"
                  onChange={(e) => setStudent({ ...student, token: e.target.value })}
                  value={student.token ?? ""}
                  disabled={loading}
                  required
                />
              </div>
              <p className="pt-3 text-error">
                {error ? <>Errore: {error.message}</> : <>&nbsp;</>}
              </p>
              <div className="flex justify-center pt-1">
                <Button className="btn-success" onClick={start} disabled={loading || !completed}>
                  Inizia
                </Button>
              </div>
            </>
          )}
        </form>
        <StudentRestoreModal ref={modalRef} />
      </div>
    </div>
  );
}

function PersonalInformationField({
  student,
  setStudent,
  field,
  disabled,
}: {
  student: Student;
  setStudent: (set: (student: Student) => Student) => void;
  field: Contest["personalInformation"][number];
  disabled?: boolean;
}) {
  const [value, setValue] = useState<string>(() => {
    const v = student.personalInformation?.[field.name] ?? "";
    if (isDate(v)) {
      return formatISO(v, { representation: "date" });
    } else {
      return String(v);
    }
  });
  const [error, setError] = useState<string>();
  const [blur, setBlur] = useState(false);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBlur(false);
    setValue(e.target.value);

    const [newValue, error] = parsePersonalInformation(e.target.value, field);

    setStudent((student) => ({
      ...student,
      personalInformation: {
        ...student.personalInformation,
        [field.name]: newValue,
      },
    }));
    setError(error);
  };

  return (
    <div key={field.name} className="form-control w-full">
      <label className="label">
        <span className="label-text text-lg">{field.label}</span>
      </label>
      <input
        type={field.type}
        placeholder={"Inserisci " + field.label}
        className={classNames(
          "input input-bordered w-full max-w-md",
          blur && error && "input-error",
        )}
        onChange={onChange}
        onBlur={() => setBlur(true)}
        disabled={disabled}
        value={value}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        required
      />
      {blur && error && (
        <span className="p-1 text-sm text-error">
          <AlertCircle className="inline size-5 pb-1 pr-1" />
          {error}
        </span>
      )}
    </div>
  );
}

const StudentRestoreModal = forwardRef(function StudentRestoreModal(
  props,
  ref: React.Ref<HTMLDialogElement>,
) {
  const db = useDb();
  const auth = getAuth(db.app);
  const user = auth.currentUser!;

  return (
    <Modal ref={ref} title="Attenzione">
      <p>
        Il tuo account è già presente su un&apos;altro dispositivo. Per trasferire l&apos;accesso al
        dispositivo corrente comunica al tuo insegnante il codice seguente:
      </p>
      <div className="flex justify-center pt-3">
        <span className="pt-1 font-mono text-3xl">
          {String(hash(user.uid) % 1000).padStart(3, "0")}
        </span>
      </div>
    </Modal>
  );
});

function StudentInner({
  participationId,
  studentId,
  children,
}: {
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
  const [contest] = useDocument("contests", student.contestId!, contestConverter);
  const [participation] = useDocument(
    "participations",
    student.participationId!,
    participationConverter,
    { subscribe: true },
  );

  const endingTime = useMemo(
    () => addMinutes(participation.startingTime!, contest.duration!),
    [participation.startingTime, contest.duration],
  );
  const terminated = useIsAfter(endingTime);

  const logout = async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  };

  const setStudentAndSubmit = async (newStudent: Student) => {
    if (isEqual(student, newStudent)) return;

    await setStudent(newStudent);

    if (isEqual(student.answers, newStudent.answers)) return;

    const submissionRef = collection(db, "submissions").withConverter(submissionConverter);
    await addDoc(submissionRef, {
      id: "",
      uid: newStudent.uid!,
      answers: newStudent.answers!,
    });
  };

  return (
    <StudentProvider
      contest={contest}
      participation={participation}
      student={student}
      setStudent={setStudentAndSubmit}
      submit={logout}
      logout={logout}
      terminated={terminated}>
      {children}
    </StudentProvider>
  );
}

async function createStudentRestore(
  db: Firestore,
  studentId: string,
  participationId: string,
  curStudent: Omit<Student, "id">,
) {
  // In this case the users want to log in as an already existing student
  // If it fails, it means that the token is too old
  const auth = getAuth(db.app);
  const uid = auth.currentUser!.uid;

  try {
    await setDoc(
      doc(db, `participations/${participationId}/studentRestore/${uid}`).withConverter(
        studentRestoreConverter,
      ),
      {
        id: uid,
        studentId,
        participationId,
        token: curStudent.token,
        name: curStudent.personalInformation!.name,
        surname: curStudent.personalInformation!.surname,
      },
    );
  } catch (e) {
    throw new Error("Codice scaduto");
  }
}

async function createStudent(db: Firestore, student: Student) {
  // to create the student we first need to find
  // - the variant assigned to the student
  // - the school of the student
  // Then, we need to check that there is no other student with the same personalInformation and token already in the db
  student.id = randomId();

  // Get the variant assigned to the student
  // An entry should always exist in variantMapping
  const hash = studentHash(student);
  const variant = `${student.contestId}-${hash.slice(0, 3)}`;

  const variantRef = doc(db, "variantMappings", variant).withConverter(variantMappingConverter);
  const variantMapping = await getDoc(variantRef);
  if (!variantMapping.exists()) {
    throw new Error("Variante non trovata, contattare gli amministratori della piattaforma.");
  }
  student.variant = variantMapping.data().variant;

  // Check that the token exists and get the participation id (needed to create the student)
  // If the mapping exists, the token can still be too old
  const participationMappingRef = doc(db, "participationMapping", student.token!).withConverter(
    participationMappingConverter,
  );
  const participationMapping = await getDoc(participationMappingRef);
  if (!participationMapping.exists()) {
    throw new Error("Codice non valido.");
  }
  const participationMappingData = participationMapping.data();
  if (participationMappingData.contestId !== student.contestId) {
    throw new Error("Il codice inserito non corrisponde alla gara selezionata.");
  }
  student.participationId = participationMappingData.participationId;
  student.startedAt = participationMappingData.startingTime;

  // Try to create the new student:
  // - check that there is no identical hash already in "studentMappingHash"
  // - create the student
  // - create the mappings to the student (uid -> studentId and hash -> studentId)
  // If we fail creating the student, it means that the token is too old (since it actually exists in participationMapping)

  const base = doc(db, "participations", student.participationId!);

  const studentRef = doc(base, "students", student.id).withConverter(studentConverter);
  const hashMappingRef = doc(base, "studentMappingHash", hash).withConverter(
    studentMappingHashConverter,
  );
  const uidMappingRef = doc(db, "studentMappingUid", student.uid!).withConverter(
    studentMappingUidConverter,
  );
  try {
    await runTransaction(db, async (trans) => {
      const mapping = await trans.get(hashMappingRef);
      if (mapping.exists()) {
        throw new DuplicateStudentError(mapping.data().studentId, student.participationId!);
      }

      trans.set(studentRef, student);
      trans.set(hashMappingRef, { id: hash, studentId: student.id });
      trans.set(uidMappingRef, {
        id: student.uid,
        studentId: student.id,
        participationId: student.participationId,
      });
    });
  } catch (e) {
    if ((e as FirestoreError).code === "permission-denied") {
      throw new Error("Codice scaduto.");
    }
    throw e;
  }

  return student;
}
