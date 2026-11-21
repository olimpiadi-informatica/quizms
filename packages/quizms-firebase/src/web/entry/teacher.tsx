import { useCallback } from "react";

import type { Student, StudentRestore } from "@olinfo/quizms/models";
import { TeacherProvider } from "@olinfo/quizms/teacher";
import { getAuth, signOut, type User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getBytes, getStorage, ref } from "firebase/storage";

import {
  finalizeVenue,
  startContestWindow,
  stopContestWindow,
  teacherApproveStudentRestore,
  teacherImportStudents,
  teacherRejectStudentRestore,
  teacherSetStudentsDisabled,
  teacherUpdateStudent,
} from "~/web/common/api";
import { useDb } from "~/web/common/base-login";
import {
  announcementConverter,
  contestConverter,
  studentConverter,
  studentRestoreConvert,
  variantConverter,
  venueConverter,
} from "~/web/common/converters";
import TokenLogin from "~/web/common/token-login";
import { useWebsite } from "~/web/common/website";
import { useAuth, useCollection, useDocument } from "~/web/hooks";

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
  const [venues] = useCollection("venues", venueConverter, {
    constraints: { contestId: website.contests, schoolId: schoolId },
  });
  const [variants] = useCollection("variants", variantConverter);

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <TeacherProvider
      name={venues[0]?.name ?? schoolId}
      venues={venues}
      contests={contests}
      startContestWindow={(...args) => startContestWindow(user, ...args)}
      stopContestWindow={(...args) => stopContestWindow(user, ...args)}
      finalizeVenue={(...args) => finalizeVenue(user, ...args)}
      importStudents={(venueId, students) =>
        teacherImportStudents(user, {
          venueId,
          students: students.map((s) => ({
            id: s.id,
            userData: s.userData as any,
            variantId: s.variantId,
            answers: s.answers,
            absent: s.absent,
            extraData: s.extraData,
          })),
        })
      }
      setStudentsDisabled={(venueId, studentIds, disabled) =>
        teacherSetStudentsDisabled(user, { venueId, studentIds, disabled })
      }
      variants={variants}
      logout={logout}
      statementComponent={() => <FirebaseStatement />}
      getPdfStatements={(contestId, variantIds, fileName) =>
        getPdfStatements(db, contestId, variantIds, fileName)
      }
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
  fileName = "statement.pdf",
): Promise<Record<string, ArrayBuffer>> {
  const storage = getStorage(db.app);

  const files = await Promise.all(
    variantIds.map(
      async (id) =>
        [id, await getBytes(ref(storage, `statements/${contestId}/${id}/${fileName}`))] as const,
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

function useStudents(venueId: string) {
  const auth = useAuth("teacher");
  const user = auth!.user;

  const [students] = useCollection(`venues/${venueId}/students`, studentConverter, {
    orderBy: "createdAt",
  });

  const setStudent = useCallback(
    async (student: Student) => {
      await teacherUpdateStudent(user, {
        venueId,
        student: {
          id: student.id,
          userData: student.userData,
          variantId: student.variantId,
          answers: student.answers,
          absent: student.absent,
          disabled: student.disabled,
          extraData: student.extraData,
        },
      });
    },
    [user, venueId],
  );

  return [students, setStudent] as const;
}

function useStudentRestores(
  venueId: string,
): readonly [
  StudentRestore[],
  (request: StudentRestore) => Promise<void>,
  (studentId: string) => Promise<void>,
] {
  const auth = useAuth("teacher");
  const user = auth!.user;

  const [venue] = useDocument("venues", venueId, venueConverter);

  const [studentRestores] = useCollection("studentRestores", studentRestoreConvert, {
    constraints: { venueId, token: venue.token ?? undefined, status: "pending" },
    orderBy: "createdAt",
  });

  const reject = useCallback(
    async (studentId: string) => {
      await teacherRejectStudentRestore(user, { venueId, studentId });
    },
    [user, venueId],
  );

  const approve = useCallback(
    async (request: StudentRestore) => {
      await teacherApproveStudentRestore(user, {
        venueId,
        studentRestoreId: request.id,
      });
    },
    [user, venueId],
  );

  return [studentRestores, approve, reject];
}
