import { initTRPC } from "@trpc/server";
import type * as trpcExpress from "@trpc/server/adapters/express";
import superjson from "superjson";

import { auth } from "~/functions/common";

import { ApiErrorCause } from "./errors";

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

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // Tells the client which error it is, so it can show it in the UI language.
  errorFormatter({ shape, error }) {
    const reason = error.cause instanceof ApiErrorCause ? error.cause.reason : undefined;
    return { ...shape, data: { ...shape.data, reason } };
  },
});
export const router = t.router;
export const publicProcedure = t.procedure;
