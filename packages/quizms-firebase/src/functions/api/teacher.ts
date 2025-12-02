import crypto from "node:crypto";

import type { Contest, Participation } from "@olinfo/quizms/models";
import { randomToken } from "@olinfo/quizms/utils";
import { addMinutes, addSeconds, isFuture, isPast, roundToNearestMinutes } from "date-fns";
import type { CallableRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { chunk } from "lodash-es";

import { auth, db, type Endpoint, type EndpointError } from "../common";
import {
  getContest,
  getParticipation,
  getParticipationByToken,
  getParticipationStudents,
  getUser,
} from "./queries";
import type {
  TeacherFinalizeParticipation,
  TeacherLogin,
  TeacherStartParticipation,
  TeacherStopParticipation,
} from "./schema";

export const teacherLogin: Endpoint<TeacherLogin> = async (_request, data) => {
  logger.info("Teacher login request received", { data });

  const user = await getUser(data.username);
  if (!user) {
    return { success: false, errorCode: "USER_NOT_FOUND", error: "User not found" };
  }

  if (user.role !== "teacher") {
    return { success: false, errorCode: "INVALID_ROLE", error: "User is not a teacher" };
  }
  if (user.password !== data.password) {
    return { success: false, errorCode: "INVALID_PASSWORD", error: "Wrong password" };
  }
  const token = await auth.createCustomToken(crypto.randomUUID(), {
    role: "teacher",
    schoolId: user.id,
  });
  return { success: true, data: { token } };
};

async function checkParticipation(
  request: CallableRequest<{ participationId: string }>,
  onlineOnly: boolean,
): Promise<[EndpointError] | [null, Participation, Contest]> {
  const participation = await getParticipation(request.data.participationId);
  if (!participation) {
    return [
      { success: false, errorCode: "PARTICIPATION_NOT_FOUND", error: "Participation not found" },
    ];
  }

  if (participation.schoolId !== request.auth?.token.schoolId) {
    return [
      {
        success: false,
        errorCode: "FORBIDDEN",
        error: "You don't have permission to access this participation",
      },
    ];
  }

  const contest = await getContest(participation.contestId);
  if (onlineOnly) {
    if (!contest.hasOnline) {
      return [{ success: false, errorCode: "CONTEST_OFFLINE", error: "Contest is not online" }];
    }
    if (isFuture(contest.contestWindowStart)) {
      return [
        { success: false, errorCode: "CONTEST_NOT_STARTED", error: "Contest has not started yet" },
      ];
    }
    if (isPast(contest.contestWindowEnd)) {
      return [{ success: false, errorCode: "CONTEST_ENDED", error: "Contest has already ended" }];
    }
  }

  return [null, participation, contest];
}

async function generateToken() {
  for (;;) {
    const token = await randomToken();
    if (!(await getParticipationByToken(token))) {
      return token;
    }
  }
}

export const teacherStartParticipation: Endpoint<TeacherStartParticipation> = async (
  request,
  data,
) => {
  logger.info("Teacher start participation received", { data });

  const [error, participation, contest] = await checkParticipation(request, true);
  if (error) {
    return error;
  }

  if (
    participation.endingTime != null &&
    contest.hasOnline &&
    (isFuture(participation.endingTime) || !contest.allowRestart)
  ) {
    return {
      success: false,
      errorCode: "PARTICIPATION_ALREADY_STARTED",
      error: "Participation has already been started",
    };
  }

  const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
  const endingTime = addMinutes(startingTime, contest.hasOnline ? contest.duration : 0);

  await db.doc(`participations/${participation.id}`).update({
    token: await generateToken(),
    startingTime: startingTime,
    endingTime: endingTime,
  });

  return { success: true, data: {} };
};

export const teacherStopParticipation: Endpoint<TeacherStopParticipation> = async (
  request,
  data,
) => {
  logger.info("Teacher stop participation received", { data });

  const [error, participation] = await checkParticipation(request, true);
  if (error) {
    return error;
  }

  if (participation.startingTime == null) {
    return {
      success: false,
      errorCode: "PARTICIPATION_NOT_STARTED",
      error: "Participation has not been started",
    };
  }

  if (isPast(participation.startingTime)) {
    return {
      success: false,
      errorCode: "PARTICIPATION_ALREADY_STARTED",
      error: "Participation has already been started",
    };
  }

  const students = await getParticipationStudents(participation.id, participation.token!);
  await Promise.all(students.map((student) => auth.revokeRefreshTokens(student.uid!)));

  for (const studentChunk of chunk(students, 300)) {
    const batch = db.batch();
    for (const student of studentChunk) {
      batch.delete(db.doc(`participations/${participation.id}/students/${student.id}`));
    }
    await batch.commit();
  }

  await db.doc(`participations/${participation.id}`).update({
    token: null,
    startingTime: null,
    endingTime: null,
  });

  return { success: true, data: {} };
};

export const teacherFinalizeParticipation: Endpoint<TeacherFinalizeParticipation> = async (
  request,
  data,
) => {
  logger.info("Teacher finalize participation received", { data });

  const [error, participation] = await checkParticipation(request, false);
  if (error) {
    return error;
  }

  await db.doc(`participations/${participation.id}`).update({ finalized: true });

  return { success: true, data: {} };
};
