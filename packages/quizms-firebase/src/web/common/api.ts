import type { Student } from "@olinfo/quizms/models";
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

export async function startContestWindow(user: User, venueId: string) {
  await trpc.teacherStartContestWindow.mutate({ venueId }, { context: { user } });
}

export async function stopContestWindow(user: User, venueId: string) {
  await trpc.teacherStopContestWindow.mutate({ venueId }, { context: { user } });
}

export async function finalizeVenue(user: User, venueId: string) {
  await trpc.teacherFinalizeVenue.mutate({ venueId }, { context: { user } });
}
