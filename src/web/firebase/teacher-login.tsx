import React, { ReactNode, useCallback, useState } from "react";

import { FirebaseOptions } from "firebase/app";
import { User, getAuth, signOut } from "firebase/auth";
import {
  Firestore,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getBytes, getStorage, ref } from "firebase/storage";
import { chunk } from "lodash-es";

import { Button } from "~/components";
import { Participation, StudentRestore, studentHash } from "~/models";
import { TeacherProvider } from "~/web/teacher/provider";

import { FirebaseLogin, useDb } from "./base-login";
import {
  contestConverter,
  participationConverter,
  participationMappingConverter,
  studentConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  variantConverter,
} from "./converters";
import { useCollection, usePrecompiledPasswordAuth, useSignInWithPassword } from "./hooks";
import query from "./query";

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
  const { signInWithPassword, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  const user = usePrecompiledPasswordAuth();

  if (user?.emailVerified) {
    return <TeacherInner user={user}>{children}</TeacherInner>;
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

  const [participations] = useCollection("participations", participationConverter, {
    constraints: { teacher: user.uid },
    subscribe: true,
  });
  const [contests] = useCollection("contests", contestConverter, {
    subscribe: true,
  });
  const [variants] = useCollection("variants", variantConverter);

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <TeacherProvider
      participations={participations}
      setParticipation={async (p) => setParticipation(db, participations, p)}
      contests={contests}
      variants={variants}
      logout={logout}
      getPdfStatements={async (statementVersion, variantIds) =>
        getPdfStatements(db, statementVersion, variantIds)
      }
      useStudents={useStudents}
      useStudentRestores={useStudentRestores}>
      {children}
    </TeacherProvider>
  );
}

async function setParticipation(
  db: Firestore,
  participations: Participation[],
  participation: Participation,
) {
  const prevParticipation = participations.find((s) => s.id === participation.id)!;

  const participationRef = doc(db, "participations", participation.id).withConverter(
    participationConverter,
  );

  if (prevParticipation.token === participation.token) {
    // The teacher hasn't changed the token, we simply update the participation.

    await setDoc(participationRef, participation);
  } else if (participation.token) {
    // The teacher has created a new token and wants to start the contest, we need to:
    // - update the participation token;
    // - create the participation token mapping.
    // We do this in a transaction to ensure that the token is unique.

    const participationMappingsRef = doc(
      db,
      "participationMapping",
      participation.token,
    ).withConverter(participationMappingConverter);

    await runTransaction(db, async (trans) => {
      const mapping = await trans.get(participationMappingsRef);
      if (mapping.exists()) {
        throw new Error("Token già esistente, riprova.");
      }

      trans.set(participationRef, participation);
      trans.set(participationMappingsRef, {
        id: participation.token,
        participationId: participation.id,
        startingTime: participation.startingTime,
        contestId: participation.contestId,
      });
    });
  } else {
    // The teacher cancelled the contest start, we need to:
    // - delete the participation token;
    // - delete the all the students with that token.

    const q = query(db, `participations/${participation.id}/students`, studentConverter, {
      constraints: { token: prevParticipation.token },
    });

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map((doc) => doc.data());

    await Promise.all(
      chunk(students, 100).map(async (students) => {
        const batch = writeBatch(db);
        for (const student of students) {
          batch.delete(doc(db, "studentMappingUid", student.uid!));
          batch.delete(doc(participationRef, "studentMappingHash", studentHash(student)));
          batch.delete(doc(participationRef, "students", student.id));
        }
        await batch.commit();
      }),
    );

    // TODO: there is a race condition here, a student can register after we have deleted the
    //  students but before we have deleted the token from the participation. In this case the
    //  student won't be deleted from firestore and he will receives a "Missing or insufficient
    //  permissions" error. We can't however delete the token before the students because the
    //  student will lose his permission to read the participation and will receive a "Missing
    //  or insufficient permissions" error either.
    await setDoc(participationRef, participation);
  }
}

async function getPdfStatements(db: Firestore, statementVersion: number, variantIds: string[]) {
  const storage = getStorage(db.app);

  return await Promise.all(
    variantIds.map((id) =>
      getBytes(ref(storage, `statements/${id}/statement-${statementVersion}.pdf`)),
    ),
  );
}

function useStudents(participationId: string) {
  return useCollection(`participations/${participationId}/students`, studentConverter, {
    orderBy: "createdAt",
    subscribe: true,
  });
}

function useStudentRestores(participationId: string, token: string) {
  const db = useDb();

  const base = doc(db, "participations", participationId);
  const [studentRestores] = useCollection(
    `participations/${participationId}/studentRestore`,
    studentRestoreConverter,
    {
      constraints: { token },
      subscribe: true,
      limit: 50,
    },
  );

  const reject = async (studentId: string) => {
    // Delete all the requests for this student.
    const q = query(
      db,
      `participations/${participationId}/studentRestore`,
      studentRestoreConverter,
      {
        constraints: { studentId },
        limit: 400,
      },
    );

    for (;;) {
      const requests = await getDocs(q);
      if (requests.empty) break;

      const batch = writeBatch(db);
      for (const request of requests.docs) {
        batch.delete(doc(base, "studentRestore", request.id));
      }
      await batch.commit();
    }
  };

  const approve = async (request: StudentRestore) => {
    // We need to delete the previous mapping for this student. There should be only one, but
    // we delete all of them just to be sure. Firestore limits the number of writes in a batch,
    // so we delete only the first 400 mappings, it's very unlikely that there are more, but it
    // shouldn't be a problem if there are still some old mappings in the database.
    const q = query(db, "studentMappingUid", studentMappingUidConverter, {
      constraints: { studentId: request.studentId, participationId },
      limit: 400,
    });
    const prevMappings = await getDocs(q);

    const batch = writeBatch(db);
    batch.update(doc(base, "students", request.studentId).withConverter(studentConverter), {
      uid: request.id,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "studentMappingUid", request.id).withConverter(studentMappingUidConverter), {
      id: request.id,
      studentId: request.studentId,
      participationId,
    });
    for (const mapping of prevMappings.docs) {
      batch.delete(doc(db, "studentMappingUid", mapping.id));
    }
    await batch.commit();

    await reject(request.studentId);
  };

  return [studentRestores, approve, reject] as const;
}
