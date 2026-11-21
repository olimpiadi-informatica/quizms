import { msg } from "@lingui/core/macro";
import { i18n, type MessageDescriptor } from "@olinfo/quizms/i18n";
import type { Student } from "@olinfo/quizms/models";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import { getIdToken, type User } from "firebase/auth";
import superjson from "superjson";

import type { AppRouter } from "~/functions/api";
import type { ApiErrorReason } from "~/functions/api/errors";

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

export function teacherLogin(body: { username: string; password: string }) {
  return translateErrors(trpc.teacherLogin.mutate(body));
}

export function adminLogin(body: { username: string; password: string }) {
  return translateErrors(trpc.adminLogin.mutate(body));
}

export function studentLogin(body: {
  contestId: string;
  token: string;
  userData: Required<NonNullable<Student["userData"]>>;
  extraData: Record<string, any>;
}) {
  return translateErrors(trpc.studentLogin.mutate(body));
}

export async function setStudentLanguage(user: User, language: string) {
  await translateErrors(trpc.studentSetLanguage.mutate({ language }, { context: { user } }));
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
