import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import { logger } from "firebase-functions/logger";

import { adminLogin } from "./admin";
import { studentLogin } from "./student";
import {
  teacherFinalizeParticipation,
  teacherLogin,
  teacherStartContestWindow,
  teacherStopContestWindow,
} from "./teacher";
import { createContext, router } from "./trpc";

const appRouter = router({
  adminLogin,
  studentLogin,
  teacherLogin,
  teacherStartContestWindow,
  teacherStopContestWindow,
  teacherFinalizeParticipation,
});

export type AppRouter = typeof appRouter;

const app = express();
app.use(
  "/",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError(opts) {
      const { error, path, input, ctx } = opts;
      logger.error(error.message, { error, path, input, ctx });
    },
  }),
);

export default app;
