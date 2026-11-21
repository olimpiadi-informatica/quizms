import type { Answer, Student } from "@olinfo/quizms/models";
import { createTRPCClient, httpLink } from "@trpc/client";
import { getIdToken, type User } from "firebase/auth";
import superjson from "superjson";

import type { AppRouter } from "~/functions/api";

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: "/api",
      transformer: superjson,
      async headers({ op }) {
        const user = op.context?.user as User | undefined;
        if (user) {
          const token = await getIdToken(user);
          return {
            Authorization: `Bearer ${token}`,
          };
        }
        return {};
      },
    }),
  ],
});

export function teacherLogin(body: { username: string; password: string }) {
  return trpc.teacherLogin.mutate(body);
}

export function adminLogin(body: { username: string; password: string }) {
  return trpc.adminLogin.mutate(body);
}

export function studentLogin(body: {
  contestId: string;
  token: string;
  userData: Required<NonNullable<Student["userData"]>>;
  extraData: Record<string, any>;
}) {
  return trpc.studentLogin.mutate(body);
}

export async function setStudentLanguage(user: User, language: string) {
  await trpc.studentSetLanguage.mutate({ language }, { context: { user } });
}

export async function studentSetAnswer(
  user: User,
  body: {
    problemId: string;
    answer: Answer;
  },
) {
  await trpc.studentSetAnswer.mutate(body, { context: { user } });
}

export async function studentSubmitContest(user: User) {
  await trpc.studentSubmitContest.mutate(undefined, { context: { user } });
}

export async function startContestWindow(user: User, venueId: string) {
  await trpc.teacherStartContestWindow.mutate({ venueId }, { context: { user } });
}

export async function stopContestWindow(user: User, venueId: string) {
  await trpc.teacherStopContestWindow.mutate({ venueId }, { context: { user } });
}

export async function finalizeVenue(user: User, venueId: string) {
  await trpc.teacherFinalizeVenue.mutate({ venueId }, { context: { user } });
}

export async function teacherApproveStudentRestore(
  user: User,
  body: {
    venueId: string;
    studentRestoreId: string;
  },
) {
  await trpc.teacherApproveStudentRestore.mutate(body, { context: { user } });
}

export async function teacherRejectStudentRestore(
  user: User,
  body: {
    venueId: string;
    studentId: string;
    studentRestoreId?: string;
  },
) {
  await trpc.teacherRejectStudentRestore.mutate(body, { context: { user } });
}

export async function teacherUpdateStudent(
  user: User,
  body: {
    venueId: string;
    student: {
      id: string;
      userData?: Student["userData"];
      variantId?: string;
      answers?: Student["answers"];
      absent?: boolean;
      disabled?: boolean;
      extraData?: Record<string, any>;
    };
  },
) {
  return await trpc.teacherUpdateStudent.mutate(body, { context: { user } });
}

export async function teacherSetStudentsDisabled(
  user: User,
  body: {
    venueId: string;
    studentIds: string[];
    disabled?: boolean;
  },
) {
  return await trpc.teacherSetStudentsDisabled.mutate(body, { context: { user } });
}

export async function teacherImportStudents(
  user: User,
  body: {
    venueId: string;
    students: Array<{
      id?: string;
      userData: Required<NonNullable<Student["userData"]>>;
      variantId?: string;
      answers?: Student["answers"];
      absent?: boolean;
      extraData?: Record<string, any>;
    }>;
  },
) {
  return await trpc.teacherImportStudents.mutate(body, { context: { user } });
}

export async function adminUpdateContestSettings(
  user: User,
  body: {
    contestId: string;
    settings: {
      scoreVisibility: "never" | "always" | "finalized";
      instructions?: string | null;
    };
  },
) {
  await trpc.adminUpdateContestSettings.mutate(body, { context: { user } });
}

export async function adminSetVenueFinalized(
  user: User,
  body: {
    venueId: string;
    finalized: boolean;
  },
) {
  await trpc.adminSetVenueFinalized.mutate(body, { context: { user } });
}

export async function adminCreateAnnouncement(
  user: User,
  body: {
    contestId: string;
    level: "info" | "warning" | "error";
    title: string;
    body: string;
  },
) {
  return await trpc.adminCreateAnnouncement.mutate(body, { context: { user } });
}
