import React, { ReactNode, useCallback, useState } from "react";

import { FirebaseOptions } from "firebase/app";
import { User, getAuth, signOut } from "firebase/auth";
import {
  Firestore,
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { chunk } from "lodash-es";

import { Button } from "~/core/components/button";
import { TeacherProvider } from "~/core/teacher/provider";
import { FirebaseLogin, useDb } from "~/firebase/baseLogin";
import {
  contestConverter,
  pdfConverter,
  schoolConverter,
  schoolMappingConverter,
  solutionConverter,
  studentConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  variantConverter,
} from "~/firebase/converters";
import { useCollection, useSignInWithPassword } from "~/firebase/hooks";
import { School, StudentRestore, studentHash } from "~/models";

export function TeacherLogin({
  config,
  children,
}: {
  config: FirebaseOptions;
  children: ReactNode;
}) {
  return (
    <FirebaseLogin config={config}>
      <TeacherLoginInner>{children}</TeacherLoginInner>
    </FirebaseLogin>
  );
}

function TeacherLoginInner({ children }: { children: ReactNode }) {
  const db = useDb();
  const auth = getAuth(db.app);

  const { signInWithPassword, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  if (auth.currentUser) {
    return <TeacherInner user={auth.currentUser}>{children}</TeacherInner>;
  }

  return (
    <div className="my-8 flex justify-center">
      <form className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Email</span>
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="Inserisci l'email"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Password</span>
          </label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-error">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <Button className="btn-success" onClick={signIn}>
            Accedi
          </Button>
        </div>
      </form>
    </div>
  );
}

function TeacherInner({ user, children }: { user: User; children: ReactNode }) {
  const db = useDb();

  const [schools] = useCollection("schools", schoolConverter, {
    constraints: { teacher: user.uid },
    subscribe: true,
  });
  const [contests] = useCollection("contests", contestConverter);
  const [variants] = useCollection("schema", variantConverter);
  const [solutions] = useCollection("solutions", solutionConverter);

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <TeacherProvider
      schools={schools}
      setSchool={async (school) => setSchool(db, schools, school)}
      contests={contests}
      variants={variants}
      solutions={solutions}
      logout={logout}
      getPdfStatements={async (pdfVariants) => getPdfStatements(db, pdfVariants)}
      useStudents={useStudents}
      useStudentRestores={useStudentRestores}>
      {children}
    </TeacherProvider>
  );
}

async function setSchool(db: Firestore, allSchools: School[], school: School) {
  const prevSchool = allSchools.find((s) => s.id === school.id)!;

  const schoolRef = doc(db, "schools", school.id).withConverter(schoolConverter);

  if (prevSchool.token === school.token) {
    // The teacher hasn't changed the token, we simply update the school.

    await updateDoc(schoolRef, school);
  } else if (school.token) {
    // The teacher has created a new token and wants to start the contest, we need to:
    // - update the school token;
    // - create the school token mapping.
    // We do this in a transaction to ensure that the token is unique.

    const schoolMappingsRef = doc(db, "schoolMapping", school.token).withConverter(
      schoolMappingConverter,
    );

    await runTransaction(db, async (trans) => {
      const mapping = await trans.get(schoolMappingsRef);
      if (mapping.exists()) {
        throw new Error("Token già esistente, riprova.");
      }

      trans.set(schoolRef, school);
      trans.set(schoolMappingsRef, {
        id: school.token,
        school: school.id,
        startingTime: school.startingTime,
        contestId: school.contestId,
      });
    });
  } else {
    // The teacher cancelled the contest start, we need to:
    // - delete the school token;
    // - delete the all the students with that token.

    await updateDoc(schoolRef, school);

    // TODO: require index?
    const q = query(
      collection(db, "students").withConverter(studentConverter),
      where("school", "==", school.id),
      where("token", "==", school.token),
    );

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map((doc) => doc.data());

    await Promise.all(
      chunk(students, 100).map(async (students) => {
        const batch = writeBatch(db);
        for (const student of students) {
          batch.delete(doc(db, "studentMappingUid", student.uid!));
          batch.delete(doc(db, "studentMappingHash", studentHash(student)));
          batch.delete(doc(db, "students", student.id));
        }
        await batch.commit();
      }),
    );
  }
}

async function getPdfStatements(db: Firestore, pdfVariants: string[]) {
  const q = query(collection(db, "pdfs"), where(documentId(), "in", pdfVariants)).withConverter(
    pdfConverter,
  );

  const statements = await getDocs(q);
  return statements.docs.map((doc) => doc.data());
}

function useStudents(school: string) {
  return useCollection("students", studentConverter, {
    constraints: { school },
    orderBy: "createdAt",
    subscribe: true,
  });
}

function useStudentRestores(school: School) {
  const db = useDb();
  const [studentRestores] = useCollection("studentRestore", studentRestoreConverter, {
    constraints: { schoolId: school.id, token: school.token ?? "" },
    subscribe: true,
    limit: 50,
  });

  const reject = async (studentId: string) => {
    // Delete all the requests for this student.
    const q = query(
      collection(db, "studentRestore").withConverter(studentRestoreConverter),
      where("studentId", "==", studentId),
      limit(400),
    );

    for (;;) {
      const requests = await getDocs(q);
      if (requests.empty) break;

      const batch = writeBatch(db);
      for (const request of requests.docs) {
        batch.delete(doc(db, "studentRestore", request.id));
      }
      await batch.commit();
    }
  };

  const approve = async (request: StudentRestore) => {
    // We need to delete the previous mapping for this student. There should be only one, but
    // we delete all of them just to be sure. Firestore limits the number of writes in a batch,
    // so we delete only the first 400 mappings, hopefully it shouldn't be a problem if there
    // are still some old mappings in the database.
    const q = query(
      collection(db, "studentMappingUid").withConverter(studentMappingUidConverter),
      where("studentId", "==", request.studentId),
      limit(400),
    );
    const prevMappings = await getDocs(q);

    const batch = writeBatch(db);
    batch.update(doc(db, "students", request.studentId).withConverter(studentConverter), {
      uid: request.id,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "studentMappingUid", request.id).withConverter(studentMappingUidConverter), {
      id: request.id,
      studentId: request.studentId,
    });
    for (const mapping of prevMappings.docs) {
      batch.delete(doc(db, "studentMappingUid", mapping.id));
    }
    await batch.commit();

    await reject(request.studentId);
  };

  return [studentRestores, approve, reject] as const;
}
