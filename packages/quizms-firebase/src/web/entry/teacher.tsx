import { useCallback } from "react";

import type { StudentRestore } from "@olinfo/quizms/models";
import { TeacherProvider } from "@olinfo/quizms/teacher";
import { getAuth, signOut, type User } from "firebase/auth";
import { doc, type Firestore, serverTimestamp, writeBatch } from "firebase/firestore";
import { getBytes, getStorage, ref } from "firebase/storage";

import { finalizeParticipation, startParticipation, stopParticipation } from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import {
  announcementConverter,
  contestConverter,
  participationConverter,
  studentConverter,
  studentRestoreConvert,
  variantConverter,
} from "~/web/common/converters";
import TokenLogin from "~/web/common/token-login";
import { useWebsite } from "~/web/common/website";
import { useCollection, useDocument } from "~/web/hooks";

import { FirebaseStatement } from "./student-statement";

export default function TeacherEntry() {
  return (
    <TokenLogin allowedRole="teacher">
      {({ user, claims }) => <TeacherInner user={user} schoolId={claims.schoolId} />}
    </TokenLogin>
  );
}

function TeacherInner({ user, schoolId }: { user: User; schoolId: string }) {
  const db = useDb();

  const website = useWebsite();
  const [contests] = useCollection("contests", contestConverter, {
    constraints: { id: website.contests },
  });
  const [participations] = useCollection("participations", participationConverter, {
    constraints: { contestId: website.contests, schoolId: schoolId },
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
      startParticipation={(...args) => startParticipation(user, ...args)}
      stopParticipation={(...args) => stopParticipation(user, ...args)}
      finalizeParticipation={(...args) => finalizeParticipation(user, ...args)}
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

function useAnnouncements(contestId: string) {
  const [announcements] = useCollection("announcements", announcementConverter, {
    arrayConstraints: {
      contestIds: contestId,
    },
    orderBy: ["createdAt", "desc"],
  });
  return announcements;
}

function useStudents(participationId: string) {
  return useCollection(`participations/${participationId}/students`, studentConverter, {
    orderBy: "createdAt",
  });
}

function useStudentRestores(
  participationId: string,
): readonly [
  StudentRestore[],
  (request: StudentRestore) => Promise<void>,
  (studentId: string) => Promise<void>,
] {
  const db = useDb();

  const [participation] = useDocument("participations", participationId, participationConverter);

  const [studentRestores] = useCollection("studentRestores", studentRestoreConvert, {
    constraints: { participationId, token: participation.token ?? undefined, status: "pending" },
    orderBy: "createdAt",
  });

  const reject = async (studentId: string, excludeRestoreId?: string) => {
    const batch = writeBatch(db);

    for (const studentRestore of studentRestores) {
      if (studentRestore.studentId === studentId && studentRestore.id !== excludeRestoreId) {
        batch.update(doc(db, "studentRestores", studentRestore.id), { status: "revoked" });
      }
    }

    await batch.commit();
  };

  const approve = async (request: StudentRestore) => {
    const batch = writeBatch(db);
    batch.update(doc(db, `/participations/${participationId}/students`, request.studentId), {
      uid: request.id,
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(db, "studentRestores", request.id));
    await batch.commit();

    await reject(request.studentId, request.id);
  };

  return [studentRestores, approve, reject];
}
