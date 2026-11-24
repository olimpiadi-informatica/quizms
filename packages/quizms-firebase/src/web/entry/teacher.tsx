import { createContext, use, useCallback } from "react";

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
  teacherApproveSubmission,
  teacherImportStudents,
  teacherRejectStudentRestore,
  teacherRejectSubmission,
  teacherReopenStudent,
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
import { useCollection, useDocument } from "~/web/hooks";

import { FirebaseStatement } from "./student-statement";

// `useStudents` and `useStudentRestores` are called by `TeacherProvider` with the venue only:
// they get the logged in teacher from this context.
const TeacherUserContext = createContext<User>(null as unknown as User);

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
    <TeacherUserContext value={user}>
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
              // Rows without a name or surname are rejected by the API.
              userData: s.userData as Required<NonNullable<Student["userData"]>>,
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
        reopenStudent={(venueId, studentId) => teacherReopenStudent(user, { venueId, studentId })}
        approveSubmission={(venueId, studentId) =>
          teacherApproveSubmission(user, { venueId, studentId })
        }
        rejectSubmission={(venueId, studentId) =>
          teacherRejectSubmission(user, { venueId, studentId })
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
    </TeacherUserContext>
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
  const user = use(TeacherUserContext);

  const [students, setStudentOptimistic] = useCollection(
    `venues/${venueId}/students`,
    studentConverter,
    { orderBy: "createdAt" },
  );

  // The edit is shown immediately (with the score computed by the table) and rolled back if the
  // API rejects it; the snapshot listener then brings the data saved by the server.
  const setStudent = useCallback(
    (student: Student) =>
      setStudentOptimistic(student, () =>
        teacherUpdateStudent(user, {
          venueId,
          student: {
            id: student.id,
            userData: student.userData,
            variantId: student.variantId ?? null,
            answers: student.answers,
            absent: student.absent,
            disabled: student.disabled,
            extraData: student.extraData,
          },
        }),
      ),
    [setStudentOptimistic, user, venueId],
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
  const user = use(TeacherUserContext);

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
