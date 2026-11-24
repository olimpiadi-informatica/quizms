import { msg } from "@lingui/core/macro";
import { i18n, type MessageDescriptor } from "@olinfo/quizms/i18n";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
import { getIdToken, type User } from "firebase/auth";
import superjson from "superjson";

import type { AppRouter } from "~/functions/api";
import type { ApiErrorReason } from "~/functions/api/errors";

type Inputs = inferRouterInputs<AppRouter>;

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

const errorMessages: Record<ApiErrorReason, MessageDescriptor> = {
  unknownUsername: msg`Username does not exist`,
  wrongPassword: msg`Wrong password`,
  userDisabled: msg`This account is not enabled`,
  invalidContest: msg`Invalid contest`,
  contestNotOnline: msg`This contest cannot be taken online`,
  contestNotStarted: msg`The contest has not started`,
  contestEnded: msg`The contest has already ended`,
  contestAlreadyStarted: msg`The contest has already started`,
  invalidToken: msg`Invalid test code`,
  alreadyParticipated: msg`You have already taken part in this contest`,
  invalidLogin: msg`Invalid login`,
  invalidStudent: msg`Invalid student`,
  invalidLanguage: msg`Invalid language`,
};

/**
 * Shows API errors in the UI language. Errors without a known reason (e.g. from older functions)
 * keep the message sent by the server.
 */
async function translateErrors<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof TRPCClientError) {
      const reason = (err.data as { reason?: ApiErrorReason } | undefined)?.reason;
      const message = reason && errorMessages[reason];
      if (message) {
        throw new Error(i18n._(message), { cause: err });
      }
    }
    throw err;
  }
}

export function teacherLogin(body: Inputs["teacherLogin"]) {
  return translateErrors(trpc.teacherLogin.mutate(body));
}

export function adminLogin(body: Inputs["adminLogin"]) {
  return translateErrors(trpc.adminLogin.mutate(body));
}

export function studentLogin(body: Inputs["studentLogin"]) {
  return translateErrors(trpc.studentLogin.mutate(body));
}

export async function setStudentLanguage(user: User, language: string) {
  await translateErrors(trpc.studentSetLanguage.mutate({ language }, { context: { user } }));
}

export async function studentSetAnswer(user: User, body: Inputs["studentSetAnswer"]) {
  await trpc.studentSetAnswer.mutate(body, { context: { user } });
}

export async function studentSubmitContest(user: User) {
  await trpc.studentSubmitContest.mutate(undefined, { context: { user } });
}

export async function startContestWindow(user: User, venueId: string) {
  await translateErrors(trpc.teacherStartContestWindow.mutate({ venueId }, { context: { user } }));
}

export async function stopContestWindow(user: User, venueId: string) {
  await translateErrors(trpc.teacherStopContestWindow.mutate({ venueId }, { context: { user } }));
}

export async function finalizeVenue(user: User, venueId: string) {
  await translateErrors(trpc.teacherFinalizeVenue.mutate({ venueId }, { context: { user } }));
}

export async function teacherApproveStudentRestore(
  user: User,
  body: Inputs["teacherApproveStudentRestore"],
) {
  await trpc.teacherApproveStudentRestore.mutate(body, { context: { user } });
}

export async function teacherRejectStudentRestore(
  user: User,
  body: Inputs["teacherRejectStudentRestore"],
) {
  await trpc.teacherRejectStudentRestore.mutate(body, { context: { user } });
}

export async function teacherReopenStudent(user: User, body: Inputs["teacherReopenStudent"]) {
  await translateErrors(trpc.teacherReopenStudent.mutate(body, { context: { user } }));
}

export async function teacherApproveSubmission(
  user: User,
  body: Inputs["teacherApproveSubmission"],
) {
  await translateErrors(trpc.teacherApproveSubmission.mutate(body, { context: { user } }));
}

export async function teacherRejectSubmission(user: User, body: Inputs["teacherRejectSubmission"]) {
  await translateErrors(trpc.teacherRejectSubmission.mutate(body, { context: { user } }));
}

export async function teacherUpdateStudent(user: User, body: Inputs["teacherUpdateStudent"]) {
  return await trpc.teacherUpdateStudent.mutate(body, { context: { user } });
}

export async function teacherSetStudentsDisabled(
  user: User,
  body: Inputs["teacherSetStudentsDisabled"],
) {
  return await trpc.teacherSetStudentsDisabled.mutate(body, { context: { user } });
}

export async function teacherImportStudents(user: User, body: Inputs["teacherImportStudents"]) {
  return await trpc.teacherImportStudents.mutate(body, { context: { user } });
}

export async function adminUpdateContestSettings(
  user: User,
  body: Inputs["adminUpdateContestSettings"],
) {
  await trpc.adminUpdateContestSettings.mutate(body, { context: { user } });
}

export async function adminSetVenueFinalized(user: User, body: Inputs["adminSetVenueFinalized"]) {
  await trpc.adminSetVenueFinalized.mutate(body, { context: { user } });
}

export async function adminCreateAnnouncement(user: User, body: Inputs["adminCreateAnnouncement"]) {
  return await trpc.adminCreateAnnouncement.mutate(body, { context: { user } });
}
