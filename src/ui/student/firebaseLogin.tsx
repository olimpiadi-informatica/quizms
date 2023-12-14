import React, {
  ChangeEvent,
  ComponentType,
  Suspense,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { sha256 } from "@noble/hashes/sha256";
import classNames from "classnames";
import { addMinutes, differenceInMilliseconds, formatISO } from "date-fns";
import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  Firestore,
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { isEqual } from "lodash-es";

import {
  contestConverter,
  schoolConverter,
  schoolMappingConverter,
  studentConverter,
  studentMappingHashConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  submissionConverter,
  variantConverter,
  variantMappingConverter,
} from "~/firebase/converters";
import { useAnonymousAuth, useCollection, useDocument } from "~/firebase/hooks";
import { FirebaseLogin, useDb } from "~/firebase/login";
import { parsePersonalInformation } from "~/models/contest";
import { Student } from "~/models/student";
import { RemoteContest } from "~/ui";
import Loading from "~/ui/components/loading";
import useTime from "~/ui/components/time";
import Timer from "~/ui/components/timer";
import { hash, randomId } from "~/utils/random";

import Modal from "../components/modal";
import { Layout } from "./layout";
import { StudentProvider, useStudent } from "./provider";

class DuplicateStudentError extends Error {
  studentId: string = "";
  schoolId: string = "";
}

class InvalidTokenError extends Error {}

export function FirebaseStudentLogin({
  config,
  contestFilter,
  header,
}: {
  config: FirebaseOptions;
  contestFilter?: string[];
  header: ComponentType<any>; // TODO: rimuovimi
}) {
  return (
    <FirebaseLogin config={config}>
      <StudentLogin header={header} contestFilter={contestFilter} />
    </FirebaseLogin>
  );
}

function StudentLogin({
  contestFilter,
  header,
}: {
  contestFilter?: string[];
  header: ComponentType<any>;
}) {
  const db = useDb();
  const getNow = useTime();

  const user = useAnonymousAuth();
  const [contests] = useCollection("contests", contestConverter);
  const [students, setStudent] = useCollection("students", studentConverter, {
    constraints: {
      uid: user?.uid,
    },
    limit: 1,
  });

  const filteredContests = contests.filter(
    (contest) => contestFilter?.includes(contest.id) ?? true,
  );

  const [student, setLocalStudent] = useState<Student>({
    id: randomId(),
    uid: user?.uid,
    contest: filteredContests.length === 1 ? filteredContests[0].id : undefined,
    personalInformation: {},
    answers: {},
    createdAt: getNow(),
  });
  const contest = contests.find((c) => c.id === student.contest);

  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  if (students[0]?.startedAt) {
    return <StudentInner header={header} student={students[0]} setStudent={setStudent} />;
  }

  const completed =
    contest?.personalInformation?.every((p) => student.personalInformation?.[p.name]) &&
    !!student.token;

  const start = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const newStudent = await createStudent(db, { ...student });
      await setStudent(newStudent);
    } catch (e) {
      if (e instanceof DuplicateStudentError) {
        try {
          await createStudentRestore(db, e.studentId, e.schoolId, student);
          modalRef.current?.showModal();
        } catch (e) {
          setError(e as Error);
        }
      } else {
        setError(e as Error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="h-full">
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4">
        <form className="my-8 w-full max-w-md grow">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg">Gara</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={student.contest ?? -1}
              onChange={(e) => setLocalStudent({ ...student, contest: e.target.value })}
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

          {contest?.personalInformation.map((field) => {
            const value = student.personalInformation?.[field.name];
            const formattedValue =
              value instanceof Date
                ? formatISO(value, { representation: "date" })
                : (value as string) ?? "";

            const onChange = (e: ChangeEvent<HTMLInputElement>) => {
              const value = parsePersonalInformation(e.target.value, field);
              setLocalStudent((student) => ({
                ...student,
                personalInformation: {
                  ...student.personalInformation,
                  [field.name]: value,
                },
              }));
            };

            return (
              <div key={field.name} className="form-control w-full">
                <label className="label">
                  <span className="label-text text-lg">{field.label}</span>
                </label>
                <input
                  type={field.type}
                  placeholder={"Inserisci " + field.label}
                  className="input input-bordered w-full max-w-md"
                  onChange={onChange}
                  disabled={loading}
                  value={formattedValue}
                  required
                />
              </div>
            );
          })}

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
                  onChange={(e) => setLocalStudent({ ...student, token: e.target.value })}
                  value={student.token ?? ""}
                  disabled={loading}
                  required
                />
              </div>
              <span className="pt-1 text-error">{error?.message ?? <>&nbsp;</>}</span>
              <div className="flex justify-center pt-3">
                <button
                  className="btn btn-success"
                  onClick={start}
                  type="button"
                  disabled={loading || !completed}>
                  <span
                    className={classNames("loading loading-spinner", !loading && "hidden")}></span>
                  Inizia
                </button>
              </div>
            </>
          )}
        </form>
        <StudentRestoreModal ref={modalRef} />
      </div>
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

  useCollection("students", studentConverter, {
    constraints: {
      uid: user?.uid,
    },
    limit: 1,
    subscribe: true,
  });

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
  student,
  setStudent,
  header: Header,
}: {
  student: Student;
  setStudent: (student: Student) => Promise<void>;
  header: ComponentType<any>;
}) {
  const db = useDb();

  const [contest] = useDocument("contests", student.contest!, contestConverter);
  const [school] = useDocument("schools", student.school!, schoolConverter, { subscribe: true });

  const logout = async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  };

  const getNow = useTime();

  const [started, setStarted] = useState(false);
  useEffect(() => {
    const id = setTimeout(
      () => setStarted(true),
      differenceInMilliseconds(school.startingTime!, getNow()) + 1000 + Math.random() * 1000,
    );
    return () => clearTimeout(id);
  }, [school.startingTime, getNow]);

  const [terminated, setTerminated] = useState(false);
  useEffect(() => {
    const id = setTimeout(
      () => setTerminated(true),
      differenceInMilliseconds(addMinutes(school.startingTime!, contest.duration!), getNow()),
    );
    return () => clearTimeout(id);
  }, [school.startingTime, contest.duration, getNow]);

  const setStudentAndSubmit = async (newStudent: Student) => {
    if (isEqual(student, newStudent)) return;

    await setStudent(newStudent);

    if (isEqual(student.answers, newStudent.answers)) return;

    const ref = collection(db, "submissions").withConverter(submissionConverter);
    await addDoc(ref, {
      id: "",
      uid: newStudent.uid!,
      answers: newStudent.answers!,
    });
  };

  return (
    <StudentProvider
      contest={contest}
      school={school}
      student={student}
      setStudent={setStudentAndSubmit}
      submit={logout}
      logout={logout}
      terminated={terminated}>
      <Layout>
        <Header />
        {!started && (
          <div className="flex h-screen justify-center">
            <div className="flex items-center justify-center text-2xl">
              La gara inizierà tra
              <span className="px-2">
                <Timer endTime={school.startingTime!} />
              </span>
            </div>
          </div>
        )}
        {started && (
          <Suspense fallback={<Loading />}>
            <ContestInner />
          </Suspense>
        )}
      </Layout>
    </StudentProvider>
  );
}

async function createStudentRestore(
  db: Firestore,
  studentId: string,
  schoolId: string,
  curStudent: Omit<Student, "id">,
) {
  // In this case the users want to log in as an already existing student
  // If it fails, it means that the token is too old
  const auth = getAuth(db.app);
  const uid = auth.currentUser!.uid;

  try {
    await setDoc(doc(db, "studentRestore", uid).withConverter(studentRestoreConverter), {
      id: uid,
      studentId: studentId,
      schoolId: schoolId,
      token: curStudent.token,
      name: curStudent.personalInformation!.name,
      surname: curStudent.personalInformation!.surname,
    });
  } catch (e) {
    throw new InvalidTokenError("Codice scaduto");
  }
}

async function createStudent(db: Firestore, student: Student) {
  // to create the student we first need to find
  // - the variant assigned to the student
  // - the school of the student
  // Then, we need to check that there is no other student with the same personalInformation and token already in the db
  student.id = randomId();

  // Get the variant assigned to the student
  // An entry should always exists in variantMapping
  const hash = [
    ...sha256(
      [
        student.personalInformation!.name,
        student.personalInformation!.surname,
        student.personalInformation!.classYear,
        student.personalInformation!.classSection,
        student.token,
      ].join("$"),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const variant = `${student.contest}-${hash.slice(0, 3)}`;

  const variantRef = doc(db, "variantMapping", variant).withConverter(variantMappingConverter);
  const variantMapping = await getDoc(variantRef);
  if (!variantMapping.exists()) {
    throw new Error("Variante non trovata, contattare gli amministratori della piattaforma");
  }
  student.variant = variantMapping.data().variant;

  // Check that the token exists and get the school id (needed to create the student)
  // If the mapping exists, the token can still be too old
  const schoolMappingRef = doc(db, "schoolMapping", student.token!).withConverter(
    schoolMappingConverter,
  );
  const schoolMapping = await getDoc(schoolMappingRef);
  if (!schoolMapping.exists()) {
    throw new InvalidTokenError("Codice non valido");
  }
  const schoolMappingData = schoolMapping.data();
  if (schoolMappingData.contestId != student.contest) {
    throw new InvalidTokenError("Il codice inserito non corrisponde alla gara selezionata");
  }
  student.school = schoolMappingData.school;
  student.startedAt = schoolMappingData.startingTime;

  // Try to create the new student:
  // - check that there is no identical hash already in "studentMappingHash"
  // - create the student
  // - create the mappings to the student (uid -> studentId and hash -> studentId)
  // If we fail creating the student, it means that the token is too old (since it actually exists in SchoolMapping)
  const studentRef = doc(db, "students", student.id).withConverter(studentConverter);
  const hashMappingRef = doc(db, "studentMappingHash", hash).withConverter(
    studentMappingHashConverter,
  );
  const uidMappingRef = doc(db, "studentMappingUid", student.uid!).withConverter(
    studentMappingUidConverter,
  );
  try {
    await runTransaction(db, async (trans) => {
      const mapping = await trans.get(hashMappingRef);
      if (mapping.exists()) {
        const duplicateError = new DuplicateStudentError("Studente già registrato");
        duplicateError.studentId = mapping.data().studentId;
        duplicateError.schoolId = student.school!;
        throw duplicateError;
      }

      trans.set(studentRef, student);
      trans.set(hashMappingRef, { id: hash, studentId: student.id });
      trans.set(uidMappingRef, { id: student.uid, studentId: student.id });
    });
  } catch (e) {
    if (e instanceof DuplicateStudentError) {
      throw e;
    }
    throw new InvalidTokenError("Codice scaduto");
  }

  return student;
}

function ContestInner() {
  const { student } = useStudent();

  const [variant] = useDocument("variants", student.variant!, variantConverter);

  const url = useMemo(() => {
    const blob = new Blob([variant.statement], { type: "text/javascript" });
    return URL.createObjectURL(blob);
  }, [variant.statement]);

  return <RemoteContest url={url} />;
}
