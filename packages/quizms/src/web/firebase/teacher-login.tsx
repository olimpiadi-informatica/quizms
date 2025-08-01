import { type ReactNode, useCallback } from "react";

import { msg } from "@lingui/core/macro";
import { type _t, useLingui } from "@lingui/react/macro";
import type { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  doc,
  type Firestore,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getBytes, getStorage, ref } from "firebase/storage";
import { chunk } from "lodash-es";

import type { Participation, StudentRestore } from "~/models";
import { TeacherProvider } from "~/web/teacher/provider";

import { FirebaseLogin, useDb } from "./common/base-login";
import {
  contestConverter,
  participationConverter,
  participationMappingConverter,
  studentConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  variantConverter,
} from "./common/converters";
import { studentHash } from "./common/hash";
import PasswordLogin from "./common/password-login";
import query from "./common/query";
import { useAuth, useCollection } from "./hooks";
import { FirebaseStatement } from "./student-statement";

type Props = {
  config: FirebaseOptions;
  createStatementFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

export function FirebaseTeacher({ config, ...statementProps }: Props) {
  return (
    <FirebaseLogin config={config}>
      <PasswordLogin>
        <TeacherInner {...statementProps} />
      </PasswordLogin>
    </FirebaseLogin>
  );
}

function TeacherInner({ createStatementFromFetch, statementVersion }: Omit<Props, "config">) {
  const db = useDb();
  const user = useAuth()!;
  const { t } = useLingui();

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
      setParticipation={(p) => setParticipation(db, participations, p, t)}
      contests={contests}
      variants={variants}
      logout={logout}
      statementComponent={() => (
        <FirebaseStatement
          createFromFetch={createStatementFromFetch}
          statementVersion={statementVersion}
        />
      )}
      getPdfStatements={(contestId, variantIds) => getPdfStatements(db, contestId, variantIds)}
      useStudents={useStudents}
      useStudentRestores={useStudentRestores}
    />
  );
}

async function setParticipation(
  db: Firestore,
  participations: Participation[],
  participation: Participation,
  t: typeof _t,
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
        throw new Error(t(msg`Token already exists, please try again.`));
      }

      trans.set(participationRef, participation);
      trans.set(participationMappingsRef, {
        id: participation.token,
        participationId: participation.id,
        startingTime: participation.startingTime,
        endingTime: participation.endingTime,
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

async function getPdfStatements(
  db: Firestore,
  contestId: string,
  variantIds: string[],
): Promise<Record<string, ArrayBuffer>> {
  const storage = getStorage(db.app);

  const files = await Promise.all(
    variantIds.map(
      async (id) =>
        [id, await getBytes(ref(storage, `statements/${contestId}/${id}/statement.pdf`))] as const,
    ),
  );
  return Object.fromEntries(files);
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
