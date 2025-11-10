import { useCallback } from "react";

import type { StudentRestore } from "@olinfo/quizms/models";
import { TeacherProvider } from "@olinfo/quizms/teacher";
import { getAuth, signOut, type User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getBytes, getStorage, ref } from "firebase/storage";

import { finalizeParticipation, startParticipation } from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import {
  contestConverter,
  participationConverter,
  studentConverter,
  variantConverter,
} from "~/web/common/converters";
import TokenLogin from "~/web/common/token-login";
import { useCollection } from "~/web/hooks";

import { FirebaseStatement } from "./student-statement";

export default function TeacherEntry() {
  return <TokenLogin allowedRole="teacher">{(user) => <TeacherInner user={user} />}</TokenLogin>;
}

function TeacherInner({ user }: { user: User }) {
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
      contests={contests}
      startParticipation={startParticipation}
      finalizeParticipation={finalizeParticipation}
      variants={variants}
      logout={logout}
      statementComponent={() => <FirebaseStatement />}
      getPdfStatements={(contestId, variantIds) => getPdfStatements(db, contestId, variantIds)}
      useAnnouncements={useAnnouncements}
      useStudents={useStudents}
      useStudentRestores={useStudentRestores}
    />
  );
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

function useAnnouncements(_participationId: string) {
  return [];
}

function useStudents(participationId: string) {
  return useCollection(`participations/${participationId}/students`, studentConverter, {
    orderBy: "createdAt",
    subscribe: true,
  });
}

function useStudentRestores(
  _participationId: string,
): readonly [
  StudentRestore[],
  (request: StudentRestore) => Promise<void>,
  (studentId: string) => Promise<void>,
] {
  const studentRestores: StudentRestore[] = [];

  const reject = async (_studentId: string) => {};

  const approve = async (_request: StudentRestore) => {};

  return [studentRestores, approve, reject];
}
