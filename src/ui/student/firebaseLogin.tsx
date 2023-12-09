import React, { ComponentType, ReactNode, useState } from "react";

import { sha256 } from "@noble/hashes/sha256";
import classNames from "classnames";
import { format } from "date-fns";
import { it as dateLocaleIT } from "date-fns/locale";
import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  Firestore,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  contestConverter,
  schoolConverter,
  schoolMappingConverter,
  studentConverter,
  studentMappingConverter,
  studentRestoreConverter,
  variantMappingConverter,
} from "~/firebase/converters";
import { useAnonymousAuth, useCollection, useDocument } from "~/firebase/hooks";
import { FirebaseLogin, useDb } from "~/firebase/login";
import { Student } from "~/models/student";

import { Layout } from "./layout";
import { StudentProvider } from "./provider";

class DuplicateStudentError extends Error {
  studentId: string = "";
  schoolId: string = "";
}

export function FirebaseStudentLogin({
  config,
  children,
  header,
}: {
  config: FirebaseOptions;
  children: ReactNode;
  header: ComponentType<any>; // TODO: rimuovimi
}) {
  return (
    <FirebaseLogin config={config}>
      <StudentLogin header={header}>{children}</StudentLogin>
    </FirebaseLogin>
  );
}

function StudentLogin({ header, children }: { header: ComponentType<any>; children: ReactNode }) {
  const db = useDb();

  const user = useAnonymousAuth();
  const [contests] = useCollection("contests", contestConverter);
  const [students] = useCollection("students", studentConverter, {
    constraints: {
      uid: user.uid,
    },
    limit: 1,
  });

  const [student, setStudent] = useState<Student>({
    id: window.crypto.randomUUID(),
    uid: user.uid,
    personalInformation: {
      name: "Carlo",
      surname: "Collodel",
      classYear: "5",
      classSection: "B",
    },
    contest: contests[0]?.id,
    answers: {},
    createdAt: new Date(),
  });
  const contest = contests.find((c) => c.id === student.contest);

  const [error, setError] = useState<Error>();

  const [loading, setLoading] = useState(false);

  if (students[0]) {
    return (
      <StudentInner header={header} student={students[0]}>
        {children}
      </StudentInner>
    );
  }

  const start = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const newStudent = await createStudent(db, { ...student });
      setStudent(newStudent);
    } catch (e) {
      if (e instanceof DuplicateStudentError) {
        await createStudentRestore(db, e.studentId, e.schoolId, student);
      } else {
        setError(e as Error);
      }
    }
    setLoading(false);
  };

  if (student.startedAt) {
    return (
      <StudentInner header={header} student={student}>
        {children}
      </StudentInner>
    );
  }

  return (
    <div className="my-8 flex justify-center overflow-y-auto">
      <form className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Gara</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={student.contest ?? -1}
            onChange={(e) => setStudent({ ...student, contest: e.target.value })}
            required>
            <option value={-1} disabled>
              Seleziona una gara
            </option>
            {contests.map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.name}
              </option>
            ))}
          </select>
        </div>

        {contest?.personalInformation.map((pi) => {
          const value = student.personalInformation?.[pi.name];
          return (
            <div key={pi.name} className="form-control w-full">
              <label className="label">
                <span className="label-text text-lg">{pi.label}</span>
              </label>
              <input
                type={pi.type}
                placeholder={"Inserisci " + pi.label}
                className="input input-bordered w-full max-w-md"
                onChange={(e) => {
                  const info: any = student.personalInformation ?? {};
                  info[pi.name] = e.target.value;
                  setStudent({ ...student, personalInformation: info });
                }}
                value={
                  value instanceof Date
                    ? format(value, "P", { locale: dateLocaleIT })
                    : (value as string) ?? ""
                }
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
                onChange={(e) => setStudent({ ...student, token: e.target.value })}
                value={student.token ?? ""}
                required
              />
            </div>
            <span className="pt-1 text-error">{error?.message ?? <>&nbsp;</>}</span>
            <div className="flex justify-center pt-3">
              <button className="btn btn-success" onClick={start} type="button" disabled={loading}>
                <span
                  className={classNames("loading loading-spinner", !loading && "hidden")}></span>
                Inizia
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function StudentInner({
  student,
  header: Header,
  children,
}: {
  student: Student;
  header: ComponentType<any>;
  children: ReactNode;
}) {
  const db = useDb();

  console.log("Fetch contest", student.contest);
  const [contest] = useDocument("contests", student.contest!, contestConverter);

  console.log("Fetch school", student.school);
  const [school] = useDocument("schools", student.school!, schoolConverter);

  const logout = async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  };

  console.log(student);
  return (
    <StudentProvider
      contest={contest}
      school={school}
      student={student}
      setStudent={async () => {}}
      variant="0"
      submit={() => {}}
      reset={() => {}}
      logout={logout}
      terminated={false}>
      <Layout>
        <Header />
        {children}
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
  const auth = getAuth(db.app);
  const uid = auth.currentUser!.uid;
  console.log("createStudentRestore", uid, studentId, schoolId, curStudent);

  await setDoc(doc(db, "studentRestore", uid).withConverter(studentRestoreConverter), {
    id: uid,
    studentId: studentId,
    schoolId: schoolId,
    name: curStudent.personalInformation!.name,
    surname: curStudent.personalInformation!.surname,
  });
  console.log("createStudentRestore1");
}

async function createStudent(db: Firestore, student: Student) {
  student.id = window.crypto.randomUUID();

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

  console.log("Variant found!", student.variant);

  const schoolMappingRef = doc(db, "schoolMapping", student.token!).withConverter(
    schoolMappingConverter,
  );
  const schoolMapping = await getDoc(schoolMappingRef);
  if (!schoolMapping.exists()) {
    throw new Error("Codice non valido");
  }
  const schoolMappingData = schoolMapping.data();
  student.school = schoolMappingData.school;
  student.startedAt = schoolMappingData.startingTime;

  console.log("School found!", student.school);

  const studentRef = doc(db, "students", student.id).withConverter(studentConverter);
  const hashMappingRef = doc(db, "studentMapping", hash).withConverter(studentMappingConverter);

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
  });

  console.log("Student updated!", student);
  console.log("Mapping updated!", student);

  const mappingRef = doc(db, "studentMapping", student.uid!).withConverter(studentMappingConverter);
  await setDoc(mappingRef, { id: student.uid, studentId: student.id });

  console.log("Mapping updated again!", student);

  return student;
}
