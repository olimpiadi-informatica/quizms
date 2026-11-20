import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import { logger } from "firebase-functions/logger";

import { adminLogin } from "./admin";
import {
  studentLogin,
  studentSetAnswer,
  studentSetLanguage,
  studentSubmitContest,
} from "./student";
import {
  teacherApproveStudentRestore,
  teacherFinalizeVenue,
  teacherLogin,
  teacherRejectStudentRestore,
  teacherStartContestWindow,
  teacherStopContestWindow,
} from "./teacher";
import { createCallerFactory, createContext, router } from "./trpc";

export const appRouter = router({
  adminLogin,
  studentLogin,
  studentSetAnswer,
  studentSetLanguage,
  studentSubmitContest,
  teacherLogin,
  teacherStartContestWindow,
  teacherStopContestWindow,
  teacherFinalizeVenue,
  teacherApproveStudentRestore,
  teacherRejectStudentRestore,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);

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
