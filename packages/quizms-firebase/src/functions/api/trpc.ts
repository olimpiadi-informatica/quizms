import { initTRPC, TRPCError } from "@trpc/server";
import type * as trpcExpress from "@trpc/server/adapters/express";
import type { DecodedIdToken } from "firebase-admin/auth";
import superjson from "superjson";

import { auth } from "~/functions/common";

export async function createContext({ req }: trpcExpress.CreateExpressContextOptions) {
  const authorization = req.header("authorization");
  if (authorization) {
    const token = authorization.replace("Bearer ", "");
    const claims = await auth.verifyIdToken(token, true);
    return { claims };
  }
  return {};
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

function unauthorized(): never {
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
}

/** Procedures for admins. */
export const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.claims?.role !== "admin") unauthorized();
  return next({ ctx: { claims: ctx.claims } });
});

/** Procedures for teachers: `ctx.claims.schoolId` is the school of the teacher. */
export const teacherProcedure = publicProcedure.use(({ ctx, next }) => {
  const claims = ctx.claims;
  if (claims?.role !== "teacher" || typeof claims.schoolId !== "string") unauthorized();
  return next({ ctx: { claims: claims as DecodedIdToken & { schoolId: string } } });
});

/** Procedures for students: `ctx.claims` identifies the student document. */
export const studentProcedure = publicProcedure.use(({ ctx, next }) => {
  const claims = ctx.claims;
  if (
    claims?.role !== "student" ||
    typeof claims.studentId !== "string" ||
    typeof claims.venueId !== "string"
  ) {
    unauthorized();
  }
  return next({
    ctx: { claims: claims as DecodedIdToken & { studentId: string; venueId: string } },
  });
});
