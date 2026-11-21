import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import { logger } from "firebase-functions/logger";

import {
  adminCreateAnnouncement,
  adminLogin,
  adminSetVenueFinalized,
  adminUpdateContestSettings,
} from "./admin";
import {
  studentLogin,
  studentSetAnswer,
  studentSetLanguage,
  studentSubmitContest,
} from "./student";
import {
  teacherApproveStudentRestore,
  teacherFinalizeVenue,
  teacherImportStudents,
  teacherLogin,
  teacherRejectStudentRestore,
  teacherSetStudentsDisabled,
  teacherStartContestWindow,
  teacherStopContestWindow,
  teacherUpdateStudent,
} from "./teacher";
import { createCallerFactory, createContext, router } from "./trpc";

export const appRouter = router({
  adminLogin,
  adminUpdateContestSettings,
  adminSetVenueFinalized,
  adminCreateAnnouncement,
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
  teacherUpdateStudent,
  teacherSetStudentsDisabled,
  teacherImportStudents,
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
