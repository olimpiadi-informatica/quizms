import { createTRPCClient, httpLink } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
import { getIdToken, type User } from "firebase/auth";
import superjson from "superjson";

import type { AppRouter } from "~/functions/api";

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

export function teacherLogin(body: Inputs["teacherLogin"]) {
  return trpc.teacherLogin.mutate(body);
}

export function adminLogin(body: Inputs["adminLogin"]) {
  return trpc.adminLogin.mutate(body);
}

export function studentLogin(body: Inputs["studentLogin"]) {
  return trpc.studentLogin.mutate(body);
}

export async function setStudentLanguage(user: User, language: string) {
  await trpc.studentSetLanguage.mutate({ language }, { context: { user } });
}

export async function studentSetAnswer(user: User, body: Inputs["studentSetAnswer"]) {
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
