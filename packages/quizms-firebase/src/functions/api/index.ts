import { validate } from "@olinfo/quizms/utils";
import type { CallableRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import { type ApiRequest, apiRequestSchema } from "./schema";
import { studentLogin } from "./student";
import {
  teacherFinalizeParticipation,
  teacherLogin,
  teacherStartParticipation,
  teacherStopParticipation,
} from "./teacher";

export async function apiHandler(request: CallableRequest) {
  logger.info(`Received request for action: ${request.data.action}`);

  let data: ApiRequest;
  try {
    data = validate(apiRequestSchema, request.data);
  } catch {
    return { success: false, errorCode: "INVALID_REQUEST", error: "Invalid request" };
  }

  try {
    switch (data.action) {
      case "studentLogin":
        return await studentLogin(request, data);
      case "teacherLogin":
        return await teacherLogin(request, data);
      case "teacherStartParticipation":
        return await teacherStartParticipation(request, data);
      case "teacherStopParticipation":
        return await teacherStopParticipation(request, data);
      case "teacherFinalizeParticipation":
        return await teacherFinalizeParticipation(request, data);
      default:
        return { success: false, errorCode: "UNKNOWN_ACTION", error: "Unknown action" };
    }
  } catch (error) {
    logger.error("Error processing request", error);
    return { success: false, errorCode: "INTERNAL_ERROR", error: "An internal error occurred" };
  }
}
