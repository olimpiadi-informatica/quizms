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

export function studentLogin(body: {
  contestId: string;
  token: string;
  userData: Required<NonNullable<Student["userData"]>>;
  extraData: Record<string, any>;
}) {
  return trpc.studentLogin.mutate(body);
}

export async function startParticipation(user: User, participationId: string) {
  await trpc.teacherStartParticipation.mutate({ participationId }, { context: { user } });
}

export async function stopParticipation(user: User, participationId: string) {
  await trpc.teacherStopParticipation.mutate({ participationId }, { context: { user } });
}

export async function finalizeParticipation(user: User, participationId: string) {
  await trpc.teacherFinalizeParticipation.mutate({ participationId }, { context: { user } });
}
