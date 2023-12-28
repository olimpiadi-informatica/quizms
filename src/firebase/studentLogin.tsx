import React, { ChangeEvent, ReactNode, forwardRef, useMemo, useRef, useState } from "react";

import { addMinutes, formatISO } from "date-fns";
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

import { Button } from "~/core/components/button";
import Modal from "~/core/components/modal";
import { useIsAfter, useTime } from "~/core/components/time";
import { StudentProvider } from "~/core/student/provider";
import { FirebaseLogin, useDb } from "~/firebase/baseLogin";
import {
  contestConverter,
  schoolConverter,
  schoolMappingConverter,
  studentConverter,
  studentMappingHashConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  submissionConverter,
  variantMappingConverter,
} from "~/firebase/converters";
import { useAnonymousAuth, useCollection, useDocument } from "~/firebase/hooks";
import { Student, parsePersonalInformation, studentHash } from "~/models";
import { hash, randomId } from "~/utils/random";

class DuplicateStudentError extends Error {
  studentId: string = "";
  schoolId: string = "";
}

class InvalidTokenError extends Error {}

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
    return (
      <StudentInner student={students[0]} setStudent={setStudent}>
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
                <Button className="btn-success" onClick={start} disabled={!completed}>
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
  children,
}: {
  student: Student;
  setStudent: (student: Student) => Promise<void>;
  children: ReactNode;
}) {
  const db = useDb();

  const [contest] = useDocument("contests", student.contest!, contestConverter);
  const [school] = useDocument("schools", student.school!, schoolConverter, { subscribe: true });

  const endingTime = useMemo(
    () => addMinutes(school.startingTime!, contest.duration!),
    [school.startingTime, contest.duration],
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
      {children}
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
  // An entry should always exist in variantMapping
  const hash = studentHash(student);
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
  if (schoolMappingData.contestId !== student.contest) {
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
